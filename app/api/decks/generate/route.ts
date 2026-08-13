import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { estimateGenerationCredits } from "@/lib/credits/estimate-generation";
import { creditsFromTokens, usdFromTokens } from "@/lib/credits/token-cost";
import { resolveBillingRates } from "@/lib/llm/models";
import { isPaidOpenRouterModel } from "@/lib/llm/models";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import { writeAuditLog } from "@/lib/data/audit";
import { captureException } from "@/lib/sentry";
import {
  assertAndSpendCredits,
  assertGenerateRateLimit,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import {
  clearDeckSource,
  completeDeckGeneration,
  createPendingDeck,
  failDeckGeneration,
  purgeExpiredSources,
  purgeFailedGenerations,
} from "@/lib/data/decks";
import {
  chunkStudyText,
  shouldChunkText,
} from "@/lib/ingest/chunk-text";
import { extractStudyText } from "@/lib/ingest/extract-text";
import { pdfPagesToImages } from "@/lib/ingest/pdf-to-images";
import { fetchStudyTextFromUrl } from "@/lib/ingest/fetch-url";
import {
  assertOwnedStoragePath,
  validateFileSignature,
  validateUpload,
} from "@/lib/ingest/validate-upload";
import {
  assertLLMReady,
  getLLMConfig,
  resolveOllamaModel,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { generateFlashcardsFromContent,
  generateFlashcardsFromImages,
  generateFlashcardsFromTopic,
  ollamaMaterialCap,
  TOPIC_SOURCE_MIME,
  UnrelatedSourceError,
} from "@/lib/llm/generate-flashcards";
import { mergeGeneratedDecks } from "@/lib/llm/merge-decks";
import { listOpenRouterFreeModels } from "@/lib/llm/openrouter-models";
import { resolveLicensedImage } from "@/lib/images/resolve-licensed-image";
import {
  deleteDeckMedia,
  deleteSourceMedia,
  downloadSourceMedia,
  cleanupDiscardedGenerations,
} from "@/lib/supabase/storage";
import type { GeneratedDeck, GeneratedFlashcard, LLMProvider, QuestionStyle } from "@/lib/types/flashcard";
import { normalizeLLMProvider } from "@/lib/types/flashcard";

const optionsSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  provider: z.enum(["openrouter", "ollama", "openai", "anthropic", "google"]),
  model: z.string().trim().min(1).max(200).optional(),
  cardCount: z.number().int().min(3).max(30).default(10),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("intermediate"),
  language: z.enum(LOCALE_CODES).default("en"),
  questionStyle: z
    .enum(["mixed", "qa", "definition", "cloze", "mcq"])
    .default("mixed"),
  mode: z.enum(["flashcards", "quiz"]).default("flashcards"),
  sourceRetention: z.enum(["none", "24h", "keep"]).default("24h"),
  illustrations: z.boolean().optional().default(false),
  imageModel: z.string().trim().min(1).max(200).optional(),
});

const textRequestSchema = optionsSchema.extend({
  sourceType: z.literal("text"),
  content: z.string().trim().min(50).max(80_000),
});

const topicRequestSchema = optionsSchema.extend({
  sourceType: z.literal("topic"),
  topic: z.string().trim().min(2).max(200),
});

const urlRequestSchema = optionsSchema.extend({
  sourceType: z.literal("url"),
  url: z.string().trim().url().max(2000),
});

const uploadRequestSchema = optionsSchema.extend({
  sourceType: z.literal("file"),
  storagePath: z.string().min(3).max(500),
  file: z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
  }),
});

const requestSchema = z.discriminatedUnion("sourceType", [
  textRequestSchema,
  topicRequestSchema,
  urlRequestSchema,
  uploadRequestSchema,
]);

function resolveRequestProvider(raw: string): LLMProvider {
  return normalizeLLMProvider(raw) ?? "openrouter";
}

async function resolveRequestModel(
  provider: LLMProvider,
  requested?: string,
): Promise<string> {
  if (provider === "ollama") {
    return resolveOllamaModel(requested);
  }
  const model = resolveOpenRouterModel(requested);
  if (isPaidOpenRouterModel(model)) return model;
  const free = await listOpenRouterFreeModels();
  if (free.some((entry) => entry.id === model)) return model;
  return getLLMConfig().openrouter.model;
}

async function attachLicensedWebImages(input: {
  userId: string;
  deckId: string;
  cards: GeneratedFlashcard[];
}): Promise<{ cards: GeneratedFlashcard[]; imagesAttached: number }> {
  const cards: GeneratedFlashcard[] = [];
  let imagesAttached = 0;

  for (const [index, card] of input.cards.entries()) {
    const query = card.imageSearchQuery?.trim() || card.imagePrompt?.trim();
    if (!query) {
      cards.push(card);
      continue;
    }
    try {
      const resolved = await resolveLicensedImage({
        query,
        allowAi: false,
        storagePath: `${input.userId}/decks/${input.deckId}/${index}`,
      });
      if (!resolved) {
        cards.push(card);
        continue;
      }
      imagesAttached += 1;
      cards.push({
        ...card,
        imageUrl: resolved.imageUrl,
        imageAttribution: resolved.attribution,
      });
    } catch {
      cards.push(card);
    }
  }

  return { cards, imagesAttached };
}

/** Hobby Vercel caps at 60s; local Ollama can take longer. Raise on Pro. */
export const maxDuration = process.env.VERCEL ? 60 : 300;

async function generateFromLongText(
  content: string,
  generationOptions: {
    provider: LLMProvider;
    model?: string;
    cardCount: number;
    difficulty: "beginner" | "intermediate" | "advanced";
    language: string;
    questionStyle: QuestionStyle;
    includeImagePrompts?: boolean;
  },
): Promise<GeneratedDeck> {
  const isOllama = generationOptions.provider === "ollama";
  const ollamaModel =
    generationOptions.provider === "ollama"
      ? resolveOllamaModel(generationOptions.model)
      : null;

  // Local models: one bounded pass — chunking multiplies timeout failures.
  if (isOllama && ollamaModel) {
    const cap = ollamaMaterialCap(ollamaModel);
    return generateFlashcardsFromContent(content.slice(0, cap), generationOptions);
  }

  if (!shouldChunkText(content)) {
    return generateFlashcardsFromContent(content, generationOptions);
  }

  const chunks = chunkStudyText(content, generationOptions.cardCount);
  const partials: GeneratedDeck[] = [];

  for (const chunk of chunks) {
    try {
      const part = await generateFlashcardsFromContent(chunk.text, {
        ...generationOptions,
        // Local models struggle with tiny per-chunk targets.
        cardCount: Math.min(30, Math.max(isOllama ? 3 : 1, chunk.cardCount)),
      });
      partials.push(part);
    } catch (error) {
      if (error instanceof UnrelatedSourceError) throw error;
      // Timeout/abort on Ollama: stop burning more sequential calls.
      if (
        isOllama &&
        error instanceof Error &&
        /timed out|aborted|timeout/i.test(error.message)
      ) {
        break;
      }
      // Skip weak chunks; merge may still succeed
    }
  }

  if (!partials.length) {
    // One bounded retry on the head of the document (not the full multi-chunk loop).
    return generateFlashcardsFromContent(
      content.slice(0, isOllama ? 12_000 : 80_000),
      generationOptions,
    );
  }

  const merged = mergeGeneratedDecks(
    partials,
    generationOptions.cardCount,
    partials[0]?.title,
  );

  if (merged.cards.length < Math.min(3, generationOptions.cardCount)) {
    throw new Error("Chunked generation produced too few usable cards");
  }

  // Extra fill-in pass is too expensive for local Ollama — accept a partial deck.
  if (!isOllama && merged.cards.length < generationOptions.cardCount) {
    const missing = generationOptions.cardCount - merged.cards.length;
    if (missing >= 3) {
      try {
        const extra = await generateFlashcardsFromContent(content.slice(0, 20_000), {
          ...generationOptions,
          cardCount: missing,
        });
        return mergeGeneratedDecks(
          [merged, extra],
          generationOptions.cardCount,
          merged.title,
        );
      } catch {
        // keep merged as-is
      }
    }
  }

  return merged;
}

export async function POST(request: Request) {
  let deckId: string | undefined;
  let userId: string | undefined;
  let spentTextAmount = 0;
  let spentImageAmount = 0;
  let charged = false;

  try {
    const session = await requireApiSession();
    userId = session.user.id;
    void purgeExpiredSources(userId);
    void purgeFailedGenerations(userId).then(cleanupDiscardedGenerations);
    const input = requestSchema.parse(await request.json());
    const provider = assertLLMReady(resolveRequestProvider(input.provider));
    const model = await resolveRequestModel(provider, input.model);
    const credits = await getOrRefreshCredits(userId);
    await assertGenerateRateLimit(userId, {
      provider,
      model,
      isUnlimited: credits.isUnlimited,
    });

    const questionStyle = (
      input.mode === "quiz" ? "mcq" : input.questionStyle
    ) as QuestionStyle;
    const wantWebImages = input.mode !== "quiz";
    const sourceMode =
      input.sourceType === "topic"
        ? "topic"
        : input.sourceType === "url"
          ? "url"
          : input.sourceType === "file"
            ? "file"
            : "text";
    const estimate = estimateGenerationCredits({
      provider,
      modelId: model,
      sourceMode,
      sourceSize: {
        charCount:
          input.sourceType === "text"
            ? input.content.length
            : input.sourceType === "topic"
              ? input.topic.length
              : undefined,
        fileBytes:
          input.sourceType === "file" ? input.file.size : undefined,
        mimeType:
          input.sourceType === "file" ? input.file.type : undefined,
      },
      cardCount: input.cardCount,
    });
    const spent = await assertAndSpendCredits({
      userId,
      textAmount: estimate.textCredits,
      imageAmount: 0,
      reason: input.mode === "quiz" ? "generate_quiz" : "generate_deck",
      meta: {
        provider,
        model,
        cardCount: input.cardCount,
        mode: input.mode,
        sourceMode,
        inputTokensEstimate: estimate.inputTokens,
        outputTokens: estimate.outputTokens,
        usdEstimate: usdFromTokens(
          {
            inputTokens: estimate.inputTokens,
            outputTokens: estimate.outputTokens,
          },
          resolveBillingRates({ provider, modelId: model }),
        ),
        textCreditsEstimated: estimate.textCredits,
        imageCreditsEstimated: 0,
      },
    });
    charged = true;
    spentTextAmount = spent.isUnlimited ? 0 : estimate.textCredits;
    spentImageAmount = 0;

    let sourceContent: string | undefined;
    let storagePath: string | undefined;
    let sourceFilename: string | undefined;
    let sourceMimeType: string | undefined;
    let sourceSizeBytes: number | undefined;

    if (input.sourceType === "text") {
      sourceContent = input.content;
    } else if (input.sourceType === "topic") {
      sourceContent = input.topic;
      sourceMimeType = TOPIC_SOURCE_MIME;
      sourceFilename = "topic";
      sourceSizeBytes = Buffer.byteLength(input.topic, "utf8");
    } else if (input.sourceType === "url") {
      const fetched = await fetchStudyTextFromUrl(input.url);
      sourceContent = fetched.content;
      sourceFilename = fetched.sourceUrl;
      sourceMimeType =
        fetched.kind === "youtube"
          ? "text/youtube"
          : fetched.kind === "markdown"
            ? "text/markdown"
            : "text/html";
      sourceSizeBytes = Buffer.byteLength(fetched.content, "utf8");
    } else {
      assertOwnedStoragePath(input.storagePath, userId);
      const upload = validateUpload(input.file);
      if (input.sourceType !== upload.sourceType) {
        throw new Error("The selected source type does not match the file");
      }
      storagePath = input.storagePath;
      sourceFilename = upload.name;
      sourceMimeType = upload.type;
      sourceSizeBytes = upload.size;
    }

    deckId = await createPendingDeck({
      userId,
      title:
        input.title ??
        (input.sourceType === "topic" ? input.topic.slice(0, 100) : "Untitled deck"),
      // Persist topic decks as text + mime marker (DB check has no "topic" yet).
      sourceType: input.sourceType === "topic" ? "text" : input.sourceType,
      sourceContent,
      storagePath,
      sourceFilename,
      sourceMimeType,
      sourceSizeBytes,
      provider,
      model,
      sourceRetention:
        input.sourceRetention === "none" ? "none" : input.sourceRetention,
    });

    const generationOptions = {
      provider,
      model,
      cardCount: input.cardCount,
      difficulty: input.difficulty,
      language: input.language,
      questionStyle,
      includeImagePrompts: wantWebImages,
    };

    let generated: GeneratedDeck;
    if (input.sourceType === "topic") {
      generated = await generateFlashcardsFromTopic(
        input.topic,
        generationOptions,
      );
    } else if (input.sourceType === "text") {
      generated = await generateFromLongText(input.content, generationOptions);
    } else if (input.sourceType === "url") {
      generated = await generateFromLongText(
        sourceContent ?? "",
        generationOptions,
      );
    } else {
      const data = await downloadSourceMedia(input.storagePath);
      validateFileSignature(data, input.file.type);

      if (input.file.type === "application/pdf") {
        const pdfBytes = new Uint8Array(data);
        let extractedText: string | null = null;
        try {
          extractedText = await extractStudyText(pdfBytes, input.file.type);
        } catch {
          // Scanned or unreadable PDF — fall back to page images + vision.
        }

        if (extractedText) {
          generated = await generateFromLongText(
            extractedText,
            generationOptions,
          );
        } else {
          try {
            const pages = await pdfPagesToImages(pdfBytes);
            generated = await generateFlashcardsFromImages(
              pages.slice(0, 3).map((page) => ({
                data: page.data,
                mediaType: page.mediaType,
              })),
              generationOptions,
            );
          } catch (rasterError) {
            const message =
              rasterError instanceof Error
                ? rasterError.message
                : String(rasterError);
            throw new Error(
              `Could not read this PDF (${message}). Try TXT/Markdown or paste the text.`,
            );
          }
        }
      } else {
        generated = await generateFromLongText(
          await extractStudyText(data, input.file.type),
          generationOptions,
        );
      }
    }

    let cards = generated.cards;
    let imagesAttached = 0;
    if (wantWebImages && deckId) {
      const illustrated = await attachLicensedWebImages({
        userId,
        deckId,
        cards,
      });
      cards = illustrated.cards;
      imagesAttached = illustrated.imagesAttached;
    }

    await completeDeckGeneration(deckId, userId, generated.title, cards);

    const rates = resolveBillingRates({ provider, modelId: model });
    const actualTextCredits = creditsFromTokens(
      generated.usage ?? {
        inputTokens: estimate.inputTokens,
        outputTokens: estimate.outputTokens,
      },
      rates,
    );
    const textRefund =
      !spent.isUnlimited && spentTextAmount > actualTextCredits
        ? spentTextAmount - actualTextCredits
        : 0;
    const imageRefund = 0;
    if (textRefund > 0 || imageRefund > 0) {
      await refundCredits({
        userId,
        textAmount: textRefund,
        imageAmount: imageRefund,
        reason: "generate_reconcile",
        meta: {
          deckId,
          textCreditsCharged: actualTextCredits,
          imageCreditsCharged: 0,
          textCreditsEstimated: estimate.textCredits,
          imageCreditsEstimated: 0,
          textCreditsRefunded: textRefund,
          imageCreditsRefunded: imageRefund,
          inputTokensEstimate: generated.usage?.inputTokens ?? estimate.inputTokens,
          outputTokens: generated.usage?.outputTokens ?? estimate.outputTokens,
          imagesAttached,
        },
      });
      spentTextAmount = actualTextCredits;
    }

    await writeAuditLog({
      userId,
      action: "generate_complete",
      entityType: "deck",
      entityId: deckId,
      meta: {
        provider,
        model,
        cardCount: cards.length,
        mode: input.mode,
        imagesAttached,
      },
    });

    // none → clear now; 24h/keep leave source (expiry set on create for 24h).
    if (input.sourceRetention === "none") {
      const leftoverPath = await clearDeckSource(deckId, userId);
      const pathToDelete = leftoverPath ?? storagePath;
      if (pathToDelete) {
        try {
          await deleteSourceMedia(pathToDelete);
        } catch {
          // Best-effort cleanup; cards are already saved.
        }
      }
    }

    return Response.json({ deckId });
  } catch (error) {
    if (error instanceof Response) return error;
    captureException(error, { deckId, userId, route: "generate" });
    const refusal =
      error instanceof UnrelatedSourceError ? error.code : undefined;
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid request"
        : error instanceof Error
          ? error.message
          : "Generation failed";

    if (deckId && userId) {
      const discarded = await failDeckGeneration(deckId, userId, message);
      if (discarded) {
        await cleanupDiscardedGenerations([discarded]);
      } else {
        try {
          await deleteDeckMedia({ userId, deckId });
        } catch {
          // Best-effort storage cleanup if the deck row was already gone.
        }
      }
    }

    if (charged && userId && (spentTextAmount > 0 || spentImageAmount > 0)) {
      try {
        await refundCredits({
          userId,
          textAmount: spentTextAmount,
          imageAmount: spentImageAmount,
          reason: "generate_refund",
          meta: { deckId: deckId ?? null, error: message.slice(0, 200) },
        });
      } catch {
        // Prefer returning the generation error; refund is best-effort.
      }
    }

    const rateLimited = /too many generates/i.test(message);
    return Response.json(
      {
        error: message,
        deckId,
        code: refusal ?? (rateLimited ? "RATE_LIMITED" : undefined),
        refunded: charged && (spentTextAmount > 0 || spentImageAmount > 0),
      },
      {
        status: refusal
          ? 422
          : rateLimited
            ? 429
            : deckId
              ? 502
              : 400,
      },
    );
  }
}
