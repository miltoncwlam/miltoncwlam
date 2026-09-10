import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { friendlyGenerateError } from "@/lib/friendly-generate-error";
import {
  estimateArtifactCredits,
  estimateOcrCredits,
} from "@/lib/credits/estimate-generation";
import { usdFromTokens } from "@/lib/credits/token-cost";
import { resolveBillingRates } from "@/lib/llm/models";
import { isPaidOpenRouterModel } from "@/lib/llm/models";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import { captureException } from "@/lib/sentry";
import {
  assertAndSpendCredits,
  assertGenerateRateLimit,
  assertGuestGenerateQuota,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { isGuestQuotaError } from "@/lib/credits/config";
import {
  createPendingDeck,
  failDeckGeneration,
  purgeExpiredSources,
} from "@/lib/data/decks";
import { extractStudyText, isSparsePdfText, readPdfTextLayer } from "@/lib/ingest/extract-text";
import { enqueueNotebookProcess } from "@/lib/ingest/notebook-job";
import { OCR_PAGE_CAP } from "@/lib/ingest/ocr-pdf";
import { fetchStudyTextFromUrl } from "@/lib/ingest/fetch-url";
import {
  assertOwnedStoragePath,
  validateFileSignature,
  validateUpload,
} from "@/lib/ingest/validate-upload";
import {
  assertLLMReady,
  getLLMConfig,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { TOPIC_SOURCE_MIME } from "@/lib/llm/generate-flashcards";
import { DEFAULT_OCR_MODEL } from "@/lib/llm/models";
import { listOpenRouterFreeModels } from "@/lib/llm/openrouter-models";
import {
  cleanupDiscardedGenerations,
  deleteSourceMedia,
  downloadSourceMedia,
} from "@/lib/supabase/storage";
import type { LLMProvider } from "@/lib/types/flashcard";
import { normalizeLLMProvider } from "@/lib/types/flashcard";

const optionsSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  provider: z.preprocess(
    (value) =>
      typeof value === "string"
        ? (normalizeLLMProvider(value) ?? value)
        : value,
    z.enum(["openrouter"]),
  ),
  model: z.string().trim().min(1).max(200).optional(),
  language: z.enum(LOCALE_CODES).default("en"),
  sourceRetention: z.enum(["none", "24h", "keep"]).default("keep"),
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

async function resolveRequestModel(requested?: string): Promise<string> {
  const model = resolveOpenRouterModel(requested);
  if (isPaidOpenRouterModel(model)) return model;
  const free = await listOpenRouterFreeModels();
  if (free.some((entry) => entry.id === model)) return model;
  return getLLMConfig().openrouter.model;
}

async function readNotebookSource(
  input: z.infer<typeof requestSchema>,
  userId: string,
): Promise<{
  sourceContent: string;
  sourceFilename?: string;
  sourceMimeType?: string;
  sourceSizeBytes?: number;
  storagePath?: string;
  ocr?: { data: Uint8Array; pageCount: number };
}> {
  if (input.sourceType === "text") {
    return requireSourceText({ sourceContent: input.content });
  }
  if (input.sourceType === "topic") {
    return requireSourceText({
      sourceContent: input.topic,
      sourceMimeType: TOPIC_SOURCE_MIME,
      sourceFilename: "topic",
      sourceSizeBytes: Buffer.byteLength(input.topic, "utf8"),
    });
  }
  if (input.sourceType === "url") {
    const fetched = await fetchStudyTextFromUrl(input.url);
    return requireSourceText({
      sourceContent: fetched.content,
      sourceFilename: fetched.sourceUrl,
      sourceMimeType:
        fetched.kind === "youtube"
          ? "text/youtube"
          : fetched.kind === "markdown"
            ? "text/markdown"
            : "text/html",
      sourceSizeBytes: Buffer.byteLength(fetched.content, "utf8"),
    });
  }

  assertOwnedStoragePath(input.storagePath, userId);
  const upload = validateUpload(input.file);
  const data = await downloadSourceMedia(input.storagePath);
  validateFileSignature(data, input.file.type);
  if (input.file.type === "application/pdf") {
    const layer = await readPdfTextLayer(data);
    if (!isSparsePdfText(layer.text)) {
      return requireSourceText({
        sourceContent: layer.text,
        storagePath: input.storagePath,
        sourceFilename: upload.name,
        sourceMimeType: upload.type,
        sourceSizeBytes: upload.size,
      });
    }
    return {
      sourceContent: "",
      storagePath: input.storagePath,
      sourceFilename: upload.name,
      sourceMimeType: upload.type,
      sourceSizeBytes: upload.size,
      ocr: {
        data,
        pageCount: Math.min(OCR_PAGE_CAP, Math.max(1, layer.totalPages)),
      },
    };
  }
  const sourceContent = await extractStudyText(data, input.file.type);
  return requireSourceText({
    sourceContent,
    storagePath: input.storagePath,
    sourceFilename: upload.name,
    sourceMimeType: upload.type,
    sourceSizeBytes: upload.size,
  });
}

function requireSourceText<T extends { sourceContent: string }>(source: T): T {
  if (!source.sourceContent.trim()) {
    throw new Error("Could not read this source. Paste the text and try again.");
  }
  return source;
}

export const maxDuration = 60;

export async function POST(request: Request) {
  let deckId: string | undefined;
  let userId: string | undefined;
  let spentTextAmount = 0;
  let charged = false;
  let storagePath: string | undefined;
  let model: string | undefined;

  try {
    const session = await requireApiSession();
    userId = session.user.id;
    void purgeExpiredSources(userId);
    const input = requestSchema.parse(await request.json());
    const provider = assertLLMReady(
      (normalizeLLMProvider(input.provider) ?? "openrouter") as LLMProvider,
    );
    const modelId = await resolveRequestModel(input.model);
    model = modelId;
    if (!model) throw new Error("Missing model");
    const credits = await getOrRefreshCredits(userId);
    await assertGuestGenerateQuota(userId, session.user.isGuest);
    await assertGenerateRateLimit(userId, {
      provider,
      model,
      isUnlimited: credits.isUnlimited,
    });

    const sourceMode =
      input.sourceType === "topic"
        ? "topic"
        : input.sourceType === "url"
          ? "url"
          : input.sourceType === "file"
            ? "file"
            : "text";
    const extracted = await readNotebookSource(input, userId);
    storagePath = extracted.storagePath;
    const sourceContent = extracted.sourceContent;
    const sourceFilename = extracted.sourceFilename;
    const sourceMimeType = extracted.sourceMimeType;
    const sourceSizeBytes = extracted.sourceSizeBytes;
    const ocrModel = DEFAULT_OCR_MODEL;

    const titleEstimate = estimateArtifactCredits({
      provider,
      modelId: model,
      sourceMode,
      sourceSize: {
        charCount: extracted.ocr ? 0 : sourceContent.length,
      },
      kind: "ingest",
    });
    const ocrEstimate = extracted.ocr
      ? estimateOcrCredits({
          provider,
          modelId: ocrModel,
          pageCount: extracted.ocr.pageCount,
        })
      : null;
    const textAmount = titleEstimate.textCredits + (ocrEstimate?.textCredits ?? 0);
    const spent = await assertAndSpendCredits({
      userId,
      textAmount,
      imageAmount: 0,
      reason: "generate_ingest",
      skipBalance: Boolean(session.user.isGuest),
      meta: {
        provider,
        model,
        sourceMode,
        ocr: Boolean(extracted.ocr),
        ocrPages: extracted.ocr?.pageCount ?? 0,
        inputTokensEstimate:
          titleEstimate.inputTokens + (ocrEstimate?.inputTokens ?? 0),
        outputTokens:
          titleEstimate.outputTokens + (ocrEstimate?.outputTokens ?? 0),
        usdEstimate: usdFromTokens(
          {
            inputTokens:
              titleEstimate.inputTokens + (ocrEstimate?.inputTokens ?? 0),
            outputTokens:
              titleEstimate.outputTokens + (ocrEstimate?.outputTokens ?? 0),
          },
          resolveBillingRates({
            provider,
            modelId: extracted.ocr ? ocrModel : model,
          }),
        ),
      },
    });
    charged = true;
    spentTextAmount = spent.isUnlimited ? 0 : textAmount;

    if (!extracted.ocr && !sourceContent.trim()) {
      throw new Error("Could not read this source. Paste the text and try again.");
    }

    const fallbackTitle =
      input.title ??
      (input.sourceType === "topic"
        ? input.topic.slice(0, 100)
        : input.sourceType === "file"
          ? input.file.name.replace(/\.[^.]+$/, "").slice(0, 100)
          : "Untitled deck");

    deckId = await createPendingDeck({
      userId,
      title: fallbackTitle,
      sourceType: input.sourceType === "topic" ? "text" : input.sourceType,
      sourceContent: extracted.ocr ? "" : sourceContent,
      storagePath,
      sourceFilename,
      sourceMimeType,
      sourceSizeBytes,
      provider,
      model,
      sourceRetention:
        input.sourceRetention === "none" ? "keep" : input.sourceRetention,
      ingestProgress: {
        language: input.language,
        needsOcr: Boolean(extracted.ocr),
        ocrNext: 1,
        ocrTotal: extracted.ocr?.pageCount,
        ocrBusy: false,
        spentTextAmount,
        preferredTitle: input.title,
      },
    });

    enqueueNotebookProcess(deckId);
    return Response.json({ deckId, status: "processing" });
  } catch (error) {
    if (error instanceof Response) return error;
    captureException(error, {
      deckId,
      userId,
      route: "notebooks",
      kind: "ingest",
      model,
    });
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid request"
        : error instanceof Error
          ? error.message
          : "Could not read this source";

    if (deckId && userId) {
      const discarded = await failDeckGeneration(deckId, userId, message);
      if (discarded) await cleanupDiscardedGenerations([discarded]);
    } else if (storagePath) {
      try {
        await deleteSourceMedia(storagePath);
      } catch {
        // ignore
      }
    }

    if (charged && userId && spentTextAmount > 0) {
      try {
        await refundCredits({
          userId,
          textAmount: spentTextAmount,
          imageAmount: 0,
          reason: "generate_refund",
          meta: { deckId: deckId ?? null, error: message.slice(0, 200) },
        });
      } catch {
        // ignore
      }
    }

    const rateLimited = /too many generates/i.test(message);
    const guestQuota = isGuestQuotaError(error);
    return Response.json(
      {
        error: friendlyGenerateError(
          message,
          guestQuota ? "GUEST_QUOTA" : rateLimited ? "RATE_LIMITED" : undefined,
        ),
        deckId,
        code: guestQuota ? "GUEST_QUOTA" : rateLimited ? "RATE_LIMITED" : undefined,
        refunded: charged && spentTextAmount > 0,
      },
      { status: guestQuota ? 403 : rateLimited ? 429 : 400 },
    );
  }
}
