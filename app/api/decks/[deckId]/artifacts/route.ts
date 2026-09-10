import { after } from "next/server";
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
  assertGuestGenerateQuota,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { isGuestQuotaError } from "@/lib/credits/config";
import { getDeckWithCards } from "@/lib/data/decks";
import {
  markArtifactFailed,
  markArtifactProcessing,
  upsertDeckArtifact,
} from "@/lib/data/artifacts";
import { generateExam } from "@/lib/llm/generate-exam";
import { generateMindmap } from "@/lib/llm/generate-mindmap";
import { generateNotes } from "@/lib/llm/generate-notes";
import { loadNotebookSource } from "@/lib/llm/load-notebook-source";
import {
  clampExamDurationMinutes,
  planExamQuestions,
} from "@/lib/llm/parse-studio";
import { EXAM_QUESTION_TYPES, type ArtifactKind } from "@/lib/types/notebook";
import type { DeckWithCards } from "@/lib/types/flashcard";

const bodySchema = z.object({
  kind: z.enum(["mindmap", "notes", "exam"]),
  language: z.enum(LOCALE_CODES).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  durationMinutes: z.number().int().min(10).max(90).optional(),
  types: z.array(z.enum(EXAM_QUESTION_TYPES)).min(1).max(7).optional(),
});

export const maxDuration = 180;

async function runArtifactJob(input: {
  deck: DeckWithCards;
  kind: ArtifactKind;
  language?: (typeof LOCALE_CODES)[number];
  difficulty?: "beginner" | "intermediate" | "advanced";
  durationMinutes: number;
  examTypes: (typeof EXAM_QUESTION_TYPES)[number][];
  model?: string;
  userId: string;
  spentTextAmount: number;
  unlimited: boolean;
  estimateTokens: { inputTokens: number; outputTokens: number };
}) {
  const { deck, kind, userId } = input;
  try {
    const source = await loadNotebookSource(deck);
    let payload;
    let usage = { inputTokens: 0, outputTokens: 0 };
    if (kind === "notes") {
      const generated = await generateNotes({
        source: source.text,
        language: input.language,
        model: input.model,
      });
      payload = generated.notes;
      usage = generated.usage;
    } else if (kind === "mindmap") {
      const generated = await generateMindmap({
        source: source.text,
        language: input.language,
        model: input.model,
      });
      payload = generated.mindmap;
      usage = generated.usage;
    } else {
      const generated = await generateExam({
        source: source.text,
        language: input.language,
        model: input.model,
        difficulty: input.difficulty,
        types: input.examTypes,
        durationMinutes: input.durationMinutes,
      });
      payload = generated.exam;
      usage = generated.usage;
    }

    await upsertDeckArtifact({
      deckId: deck.id,
      kind,
      payload,
      model: input.model,
    });

    const rates = resolveBillingRates({
      provider: "openrouter",
      modelId: input.model || "deepseek/deepseek-v4-flash",
    });
    const actual = creditsFromTokens(
      usage.inputTokens || usage.outputTokens ? usage : input.estimateTokens,
      rates,
    );
    if (!input.unlimited && input.spentTextAmount > actual) {
      await refundCredits({
        userId,
        textAmount: input.spentTextAmount - actual,
        imageAmount: 0,
        reason: "generate_reconcile",
        meta: { deckId: deck.id, kind },
      });
    }

    await writeAuditLog({
      userId,
      action: "notebook_artifact",
      entityType: "deck",
      entityId: deck.id,
      meta: { kind },
    });
  } catch (error) {
    captureException(error, {
      deckId: deck.id,
      userId,
      route: "artifacts",
      kind,
      model: input.model,
    });
    const message = error instanceof Error ? error.message : "Generation failed";
    await markArtifactFailed({ deckId: deck.id, kind, message });
    if (input.spentTextAmount > 0) {
      try {
        await refundCredits({
          userId,
          textAmount: input.spentTextAmount,
          imageAmount: 0,
          reason: "generate_refund",
          meta: { deckId: deck.id, error: message.slice(0, 200) },
        });
      } catch {
        // ignore
      }
    }
  }
}

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
    if (deck.generationStatus !== "complete") {
      return Response.json(
        { error: "Wait until this notebook has finished reading." },
        { status: 409 },
      );
    }
    const input = bodySchema.parse(await request.json());
    kind = input.kind;
    const source = await loadNotebookSource(deck);
    model = deck.generationModel || undefined;
    const credits = await getOrRefreshCredits(userId);
    await assertGuestGenerateQuota(userId, session.user.isGuest);
    await assertGenerateRateLimit(userId, {
      provider: "openrouter",
      model: model ?? "",
      isUnlimited: credits.isUnlimited,
    });

    const examTypes = input.types ?? [
      "long",
      "short",
      "tf",
      "mcq",
      "matching",
      "cloze_choice",
      "cloze_free",
    ];
    const durationMinutes = clampExamDurationMinutes(input.durationMinutes);
    const plannedCount = planExamQuestions(durationMinutes, examTypes).length;
    const estimate = estimateArtifactCredits({
      provider: "openrouter",
      modelId: model || "deepseek/deepseek-v4-flash",
      sourceMode: source.sourceMode,
      sourceSize: { charCount: source.charCount },
      kind: input.kind,
      questionCount: input.kind === "exam" ? plannedCount : undefined,
    });
    const spent = await assertAndSpendCredits({
      userId,
      textAmount: estimate.textCredits,
      imageAmount: 0,
      reason: `generate_${input.kind}`,
      skipBalance: Boolean(session.user.isGuest),
      meta: { deckId, kind: input.kind },
    });
    charged = true;
    spentTextAmount = spent.isUnlimited ? 0 : estimate.textCredits;

    await markArtifactProcessing({
      deckId,
      kind: input.kind,
      model,
    });

    after(() =>
      runArtifactJob({
        deck,
        kind: input.kind,
        language: input.language,
        difficulty: input.difficulty,
        durationMinutes,
        examTypes,
        model,
        userId: userId!,
        spentTextAmount,
        unlimited: spent.isUnlimited,
        estimateTokens: {
          inputTokens: estimate.inputTokens,
          outputTokens: estimate.outputTokens,
        },
      }),
    );

    return Response.json({ ok: true, accepted: true, kind: input.kind, status: "processing" });
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
    if (kind && userId) {
      await markArtifactFailed({
        deckId,
        kind: kind as ArtifactKind,
        message,
      }).catch(() => {});
    }
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
    const guestQuota = isGuestQuotaError(error);
    return Response.json(
      {
        error: message,
        code: guestQuota ? "GUEST_QUOTA" : rateLimited ? "RATE_LIMITED" : undefined,
        refunded: charged && spentTextAmount > 0,
      },
      { status: guestQuota ? 403 : rateLimited ? 429 : 400 },
    );
  }
}
