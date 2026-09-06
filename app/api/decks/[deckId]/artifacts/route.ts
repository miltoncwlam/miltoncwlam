import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { estimateArtifactCredits } from "@/lib/credits/estimate-generation";
import { creditsFromTokens } from "@/lib/credits/token-cost";
import { resolveBillingRates } from "@/lib/llm/models";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import { writeAuditLog } from "@/lib/data/audit";
import { captureException } from "@/lib/sentry";
import {
  assertAndSpendCredits,
  assertGenerateRateLimit,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { getDeckWithCards } from "@/lib/data/decks";
import { upsertDeckArtifact } from "@/lib/data/artifacts";
import { generateExam } from "@/lib/llm/generate-exam";
import { generateMindmap } from "@/lib/llm/generate-mindmap";
import { generateNotes } from "@/lib/llm/generate-notes";
import { loadNotebookSource } from "@/lib/llm/load-notebook-source";
import { EXAM_QUESTION_TYPES } from "@/lib/types/notebook";

const bodySchema = z.object({
  kind: z.enum(["mindmap", "notes", "exam"]),
  language: z.enum(LOCALE_CODES).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  questionCount: z.number().int().min(4).max(24).optional(),
  types: z.array(z.enum(EXAM_QUESTION_TYPES)).min(1).max(7).optional(),
});

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  let spentTextAmount = 0;
  let charged = false;
  let userId: string | undefined;
  let kind: string | undefined;
  let model: string | undefined;
  const { deckId } = await context.params;

  try {
    const session = await requireApiSession();
    userId = session.user.id;
    const deck = await getDeckWithCards(deckId, userId);
    if (!deck) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }
    const input = bodySchema.parse(await request.json());
    kind = input.kind;
    const source = await loadNotebookSource(deck);
    model = deck.generationModel || undefined;
    const credits = await getOrRefreshCredits(userId);
    await assertGenerateRateLimit(userId, {
      provider: "openrouter",
      model: model ?? "",
      isUnlimited: credits.isUnlimited,
    });

    const estimate = estimateArtifactCredits({
      provider: "openrouter",
      modelId: model || "deepseek/deepseek-v4-flash",
      sourceMode: source.sourceMode,
      sourceSize: { charCount: source.charCount },
      kind: input.kind,
      questionCount: input.questionCount,
    });
    const spent = await assertAndSpendCredits({
      userId,
      textAmount: estimate.textCredits,
      imageAmount: 0,
      reason: `generate_${input.kind}`,
      meta: { deckId, kind: input.kind },
    });
    charged = true;
    spentTextAmount = spent.isUnlimited ? 0 : estimate.textCredits;

    const language = input.language;
    let payload;
    let usage = { inputTokens: 0, outputTokens: 0 };
    if (input.kind === "notes") {
      const generated = await generateNotes({
        source: source.text,
        language,
        model,
      });
      payload = generated.notes;
      usage = generated.usage;
    } else if (input.kind === "mindmap") {
      const generated = await generateMindmap({
        source: source.text,
        language,
        model,
      });
      payload = generated.mindmap;
      usage = generated.usage;
    } else {
      const generated = await generateExam({
        source: source.text,
        language,
        model,
        difficulty: input.difficulty,
        types: input.types ?? [
          "long",
          "short",
          "tf",
          "mcq",
          "matching",
          "cloze_choice",
          "cloze_free",
        ],
        questionCount: input.questionCount ?? 12,
      });
      payload = generated.exam;
      usage = generated.usage;
    }

    const artifact = await upsertDeckArtifact({
      deckId,
      kind: input.kind,
      payload,
      model,
    });

    const rates = resolveBillingRates({
      provider: "openrouter",
      modelId: model || "deepseek/deepseek-v4-flash",
    });
    const actual = creditsFromTokens(
      usage.inputTokens || usage.outputTokens ? usage : {
        inputTokens: estimate.inputTokens,
        outputTokens: estimate.outputTokens,
      },
      rates,
    );
    if (!spent.isUnlimited && spentTextAmount > actual) {
      await refundCredits({
        userId,
        textAmount: spentTextAmount - actual,
        imageAmount: 0,
        reason: "generate_reconcile",
        meta: { deckId, kind: input.kind },
      });
    }

    await writeAuditLog({
      userId,
      action: "notebook_artifact",
      entityType: "deck",
      entityId: deckId,
      meta: { kind: input.kind },
    });

    return Response.json({ ok: true, kind: artifact.kind });
  } catch (error) {
    if (error instanceof Response) return error;
    captureException(error, {
      deckId,
      userId,
      route: "artifacts",
      kind,
      model,
    });
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid request"
        : error instanceof Error
          ? error.message
          : "Generation failed";
    if (charged && userId && spentTextAmount > 0) {
      try {
        await refundCredits({
          userId,
          textAmount: spentTextAmount,
          imageAmount: 0,
          reason: "generate_refund",
          meta: { deckId, error: message.slice(0, 200) },
        });
      } catch {
        // ignore
      }
    }
    const rateLimited = /too many generates/i.test(message);
    return Response.json(
      { error: message, refunded: charged && spentTextAmount > 0 },
      { status: rateLimited ? 429 : 400 },
    );
  }
}
