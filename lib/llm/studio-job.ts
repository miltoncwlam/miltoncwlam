import "server-only";

import { after } from "next/server";

import { estimateArtifactCredits, estimateGenerationCredits } from "@/lib/credits/estimate-generation";
import { creditsFromTokens } from "@/lib/credits/token-cost";
import { DEFAULT_OPENROUTER_MODEL, resolveBillingRates } from "@/lib/llm/models";
import {
  studioCardCount,
  studioSourceSlice,
  type AppLocale,
  type StudioDepth,
  type StudioPurpose,
} from "@/lib/i18n/locales";
import { writeAuditLog } from "@/lib/data/audit";
import { captureException } from "@/lib/sentry";
import {
  assertAndSpendCredits,
  assertGenerateRateLimit,
  assertGuestGenerateQuota,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { completeDeckGeneration, setCardsJob } from "@/lib/data/decks";
import {
  markArtifactFailed,
  markArtifactProcessing,
  upsertDeckArtifact,
} from "@/lib/data/artifacts";
import { generateExam } from "@/lib/llm/generate-exam";
import { generateMindmap } from "@/lib/llm/generate-mindmap";
import { generateNotes } from "@/lib/llm/generate-notes";
import {
  generateFlashcardsFromContent,
  generateFlashcardsFromTopic,
  TOPIC_SOURCE_MIME,
} from "@/lib/llm/generate-flashcards";
import { inferExamLane } from "@/lib/llm/exam-profiles";
import { loadNotebookSource } from "@/lib/llm/load-notebook-source";
import { clampExamDurationMinutes, planExamQuestions } from "@/lib/llm/parse-studio";
import { EXAM_QUESTION_TYPES, type ArtifactKind } from "@/lib/types/notebook";
import type { DeckWithCards } from "@/lib/types/flashcard";

export const STUDIO_KINDS = ["mindmap", "notes", "exam", "cards"] as const;
export type StudioKind = (typeof STUDIO_KINDS)[number];

async function runArtifactJob(input: {
  deck: DeckWithCards;
  kind: StudioKind;
  language?: AppLocale;
  depth: StudioDepth;
  purpose: StudioPurpose;
  durationMinutes: number;
  examTypes: (typeof EXAM_QUESTION_TYPES)[number][];
  model?: string;
  userId: string;
  spentTextAmount: number;
  unlimited: boolean;
  estimateTokens: { inputTokens: number; outputTokens: number };
  cardCount: number;
}) {
  const { deck, kind, userId } = input;
  try {
    const source = await loadNotebookSource(deck);
    const lane = inferExamLane({
      filename: deck.sourceFilename,
      title: deck.title,
      source: source.text,
      language: input.language,
    });
    const examSystem = deck.examSystem ?? lane.system;
    const examSubject = lane.subject;
    let usage = { inputTokens: 0, outputTokens: 0 };
    if (kind === "cards") {
      const options = {
        model: input.model,
        language: input.language,
        depth: input.depth,
        purpose: input.purpose,
        cardCount: input.cardCount,
        provider: deck.generationProvider ?? undefined,
        examSystem,
        examSubject,
      };
      const studyText = studioSourceSlice(source.text, input.depth);
      const generated =
        deck.sourceMimeType === TOPIC_SOURCE_MIME
          ? await generateFlashcardsFromTopic(studyText, options)
          : await generateFlashcardsFromContent(studyText, options);
      usage = generated.usage ?? usage;
      await completeDeckGeneration(deck.id, userId, deck.title, generated.cards);
      await setCardsJob(deck.id, { status: "complete" });
    } else {
      let payload;
      if (kind === "notes") {
        const generated = await generateNotes({
          source: source.text,
          language: input.language,
          model: input.model,
          depth: input.depth,
          purpose: input.purpose,
          provider: deck.generationProvider ?? undefined,
          examSystem,
          examSubject,
        });
        payload = generated.notes;
        usage = generated.usage;
      } else if (kind === "mindmap") {
        const generated = await generateMindmap({
          source: source.text,
          language: input.language,
          model: input.model,
          depth: input.depth,
          purpose: input.purpose,
          provider: deck.generationProvider ?? undefined,
          examSystem,
          examSubject,
        });
        payload = generated.mindmap;
        usage = generated.usage;
      } else {
        const generated = await generateExam({
          source: source.text,
          language: input.language,
          model: input.model,
          depth: input.depth,
          purpose: input.purpose,
          types: input.examTypes,
          durationMinutes: input.durationMinutes,
          provider: deck.generationProvider ?? undefined,
          examSystem,
          examSubject,
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
    }

    const rates = resolveBillingRates({
      provider: deck.generationProvider === "ollama" ? "ollama" : "openrouter",
      modelId: input.model || DEFAULT_OPENROUTER_MODEL,
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
    if (kind === "cards") {
      await setCardsJob(deck.id, { status: "failed", error: message });
    } else {
      await markArtifactFailed({ deckId: deck.id, kind, message });
    }
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

export async function beginStudioArtifact(input: {
  deck: DeckWithCards;
  kind: StudioKind;
  language?: AppLocale;
  depth?: StudioDepth;
  purpose?: StudioPurpose;
  durationMinutes?: number;
  examTypes?: (typeof EXAM_QUESTION_TYPES)[number][];
  userId: string;
  isGuest: boolean;
}): Promise<{ kind: StudioKind; status: "processing" }> {
  const source = await loadNotebookSource(input.deck);
  const model = input.deck.generationModel || undefined;
  const provider = input.deck.generationProvider ?? "openrouter";
  const credits = await getOrRefreshCredits(input.userId);
  await assertGuestGenerateQuota(input.userId, input.isGuest);
  await assertGenerateRateLimit(input.userId, {
    provider,
    model: model ?? "",
    isUnlimited: credits.isUnlimited || provider === "ollama",
  });

  const examTypes = input.examTypes ?? [...EXAM_QUESTION_TYPES];
  const durationMinutes = clampExamDurationMinutes(input.durationMinutes);
  const plannedCount = planExamQuestions(durationMinutes, examTypes).length;
  const depth = input.depth ?? "basic";
  const purpose = input.purpose ?? "starter";
  const cardCount = studioCardCount(depth);
  const estimate =
    input.kind === "cards"
      ? estimateGenerationCredits({
          provider,
          modelId: model || DEFAULT_OPENROUTER_MODEL,
          sourceMode: source.sourceMode,
          sourceSize: { charCount: source.charCount },
          cardCount,
        })
      : estimateArtifactCredits({
          provider,
          modelId: model || DEFAULT_OPENROUTER_MODEL,
          sourceMode: source.sourceMode,
          sourceSize: { charCount: source.charCount },
          kind: input.kind,
          questionCount: input.kind === "exam" ? plannedCount : undefined,
        });
  const spent = await assertAndSpendCredits({
    userId: input.userId,
    textAmount: estimate.textCredits,
    imageAmount: 0,
    reason: `generate_${input.kind}`,
    skipBalance: input.isGuest || provider === "ollama",
    meta: { deckId: input.deck.id, kind: input.kind },
  });
  const spentTextAmount = spent.isUnlimited ? 0 : estimate.textCredits;

  try {
    if (input.kind === "cards") {
      await setCardsJob(input.deck.id, { status: "processing" });
    } else {
      await markArtifactProcessing({
        deckId: input.deck.id,
        kind: input.kind,
        model,
      });
    }
  } catch (error) {
    if (spentTextAmount > 0) {
      await refundCredits({
        userId: input.userId,
        textAmount: spentTextAmount,
        imageAmount: 0,
        reason: "generate_refund",
        meta: { deckId: input.deck.id, kind: input.kind },
      }).catch(() => {});
    }
    throw error;
  }

  const job = {
    deck: input.deck,
    kind: input.kind,
    language: input.language,
    depth,
    purpose,
    durationMinutes,
    examTypes,
    model,
    userId: input.userId,
    spentTextAmount,
    unlimited: spent.isUnlimited,
    cardCount,
    estimateTokens: {
      inputTokens: estimate.inputTokens,
      outputTokens: estimate.outputTokens,
    },
  };
  after(() => runArtifactJob(job));

  return { kind: input.kind, status: "processing" };
}

export function markStudioKindFailed(
  deckId: string,
  kind: StudioKind,
  message: string,
) {
  if (kind === "cards") {
    return setCardsJob(deckId, { status: "failed", error: message });
  }
  return markArtifactFailed({
    deckId,
    kind: kind as ArtifactKind,
    message,
  });
}
