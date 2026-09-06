import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { estimateArtifactCredits } from "@/lib/credits/estimate-generation";
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
  completeNotebookIngest,
  createPendingDeck,
  failDeckGeneration,
  purgeExpiredSources,
  purgeFailedGenerations,
} from "@/lib/data/decks";
import { extractStudyText } from "@/lib/ingest/extract-text";
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
import { generateNotebookTitle } from "@/lib/llm/generate-notebook-title";
import { TOPIC_SOURCE_MIME } from "@/lib/llm/generate-flashcards";
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
    void purgeFailedGenerations(userId).then(cleanupDiscardedGenerations);
    const input = requestSchema.parse(await request.json());
    const provider = assertLLMReady(
      (normalizeLLMProvider(input.provider) ?? "openrouter") as LLMProvider,
    );
    const modelId = await resolveRequestModel(input.model);
    model = modelId;
    if (!model) throw new Error("Missing model");
    const credits = await getOrRefreshCredits(userId);
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
    const estimate = estimateArtifactCredits({
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
        fileBytes: input.sourceType === "file" ? input.file.size : undefined,
        mimeType: input.sourceType === "file" ? input.file.type : undefined,
      },
      kind: "ingest",
    });
    const spent = await assertAndSpendCredits({
      userId,
      textAmount: estimate.textCredits,
      imageAmount: 0,
      reason: "generate_ingest",
      meta: {
        provider,
        model,
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
      },
    });
    charged = true;
    spentTextAmount = spent.isUnlimited ? 0 : estimate.textCredits;

    let sourceContent: string | undefined;
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
      storagePath = input.storagePath;
      sourceFilename = upload.name;
      sourceMimeType = upload.type;
      sourceSizeBytes = upload.size;
      const data = await downloadSourceMedia(input.storagePath);
      validateFileSignature(data, input.file.type);
      sourceContent = await extractStudyText(data, input.file.type);
    }

    if (!sourceContent?.trim()) {
      throw new Error("Could not read this source. Paste the text and try again.");
    }

    const fallbackTitle =
      input.title ??
      (input.sourceType === "topic"
        ? input.topic.slice(0, 100)
        : "Untitled deck");

    deckId = await createPendingDeck({
      userId,
      title: fallbackTitle,
      sourceType: input.sourceType === "topic" ? "text" : input.sourceType,
      sourceContent,
      storagePath,
      sourceFilename,
      sourceMimeType,
      sourceSizeBytes,
      provider,
      model,
      sourceRetention:
        input.sourceRetention === "none" ? "keep" : input.sourceRetention,
    });

    const titled = await generateNotebookTitle({
      source: sourceContent,
      language: input.language,
      model,
      fallback: fallbackTitle,
    });

    await completeNotebookIngest(
      deckId,
      userId,
      input.title || titled.title,
      sourceContent,
    );

    const rates = resolveBillingRates({ provider, modelId: model });
    const actualTextCredits = creditsFromTokens(
      titled.usage.inputTokens || titled.usage.outputTokens
        ? titled.usage
        : {
            inputTokens: estimate.inputTokens,
            outputTokens: estimate.outputTokens,
          },
      rates,
    );
    const textRefund =
      !spent.isUnlimited && spentTextAmount > actualTextCredits
        ? spentTextAmount - actualTextCredits
        : 0;
    if (textRefund > 0) {
      await refundCredits({
        userId,
        textAmount: textRefund,
        imageAmount: 0,
        reason: "generate_reconcile",
        meta: { deckId, kind: "ingest" },
      });
      spentTextAmount = actualTextCredits;
    }

    await writeAuditLog({
      userId,
      action: "notebook_ingest",
      entityType: "deck",
      entityId: deckId,
      meta: { provider, model },
    });

    return Response.json({ deckId });
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
    return Response.json(
      {
        error: message,
        deckId,
        code: rateLimited ? "RATE_LIMITED" : undefined,
        refunded: charged && spentTextAmount > 0,
      },
      { status: rateLimited ? 429 : 400 },
    );
  }
}
