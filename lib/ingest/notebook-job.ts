import "server-only";

import { after } from "next/server";

import { env } from "@/lib/env";
import { ingestJobToken } from "@/lib/ingest/job-token";
import { OCR_PAGE_CAP, isTransientOcrError, ocrPdfPage } from "@/lib/ingest/ocr-pdf";
import type { IngestProgress } from "@/lib/ingest/progress";
import { parseIngestProgress } from "@/lib/ingest/progress";
import { creditsFromTokens } from "@/lib/credits/token-cost";
import { resolveBillingRates } from "@/lib/llm/models";
import { DEFAULT_OCR_MODEL } from "@/lib/llm/models";
import { generateNotebookTitle } from "@/lib/llm/generate-notebook-title";
import { writeAuditLog } from "@/lib/data/audit";
import { refundCredits } from "@/lib/data/credits";
import {
  claimOcrPage,
  completeNotebookIngest,
  failDeckGeneration,
  getDeckById,
  saveIngestProgress,
} from "@/lib/data/decks";
import { downloadSourceMedia } from "@/lib/supabase/storage";

export function enqueueNotebookProcess(deckId: string) {
  after(() => {
    void fetch(`${env.NEXT_PUBLIC_APP_URL}/api/notebooks/${deckId}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-job": ingestJobToken(deckId),
      },
    }).catch(() => {
      // Client poll/retry will kick the job if this fire-and-forget misses.
    });
  });
}

export type ProcessTickResult = {
  done: boolean;
  continue: boolean;
  deckId: string;
  status: "processing" | "complete" | "failed";
  error?: string;
};

async function finishTitle(deckId: string): Promise<ProcessTickResult> {
  const deck = await getDeckById(deckId);
  if (!deck) {
    return { done: true, continue: false, deckId, status: "failed", error: "Notebook not found" };
  }
  const progress = parseIngestProgress(deck.ingestProgress);
  const source = (deck.sourceContent ?? "").trim();
  if (!source) {
    await failAndRefund(
      deck.userId,
      deckId,
      progress,
      "Could not read this source. Paste the text and try again.",
    );
    return {
      done: true,
      continue: false,
      deckId,
      status: "failed",
      error: "Could not read this source. Paste the text and try again.",
    };
  }

  const titled = await generateNotebookTitle({
    source,
    language: progress?.language ?? "en",
    model: deck.generationModel ?? undefined,
    provider: deck.generationProvider ?? "openrouter",
    fallback: progress?.preferredTitle || deck.title,
  });
  await completeNotebookIngest(
    deckId,
    deck.userId,
    progress?.preferredTitle || titled.title,
    source,
  );

  const rates = resolveBillingRates({
    provider: deck.generationProvider === "ollama" ? "ollama" : "openrouter",
    modelId: progress?.needsOcr ? DEFAULT_OCR_MODEL : deck.generationModel || "",
  });
  const combined = {
    inputTokens: (progress?.inputTokens ?? 0) + titled.usage.inputTokens,
    outputTokens: (progress?.outputTokens ?? 0) + titled.usage.outputTokens,
  };
  const actual = creditsFromTokens(
    combined.inputTokens || combined.outputTokens
      ? combined
      : { inputTokens: 0, outputTokens: 0 },
    rates,
  );
  const spent = progress?.spentTextAmount ?? 0;
  if (spent > actual && actual >= 0) {
    await refundCredits({
      userId: deck.userId,
      textAmount: spent - actual,
      imageAmount: 0,
      reason: "generate_reconcile",
      meta: { deckId, kind: "ingest" },
    });
  }

  await writeAuditLog({
    userId: deck.userId,
    action: "notebook_ingest",
    entityType: "deck",
    entityId: deckId,
    meta: { ocr: Boolean(progress?.needsOcr) },
  });

  after(() => {
    void fetch(`${env.NEXT_PUBLIC_APP_URL}/api/decks/${deckId}/artifacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-job": ingestJobToken(deckId),
      },
      body: JSON.stringify({ kind: "notes" }),
    }).catch(() => {
      // Jobs poll / Retry will show a notes tile if this fire-and-forget misses.
    });
  });

  return { done: true, continue: false, deckId, status: "complete" };
}

async function failAndRefund(
  userId: string,
  deckId: string,
  progress: IngestProgress | null,
  message: string,
) {
  await failDeckGeneration(deckId, userId, message);
  const spent = progress?.spentTextAmount ?? 0;
  if (spent > 0) {
    try {
      await refundCredits({
        userId,
        textAmount: spent,
        imageAmount: 0,
        reason: "generate_refund",
        meta: { deckId, error: message.slice(0, 200) },
      });
    } catch {
      // ignore
    }
  }
}

export async function processNotebookTick(deckId: string): Promise<ProcessTickResult> {
  const deck = await getDeckById(deckId);
  if (!deck) {
    return { done: true, continue: false, deckId, status: "failed", error: "Notebook not found" };
  }
  if (deck.generationStatus === "complete") {
    return { done: true, continue: false, deckId, status: "complete" };
  }

  const progress = parseIngestProgress(deck.ingestProgress) ?? {
    language: "en" as const,
    needsOcr: false,
  };
  const nextPage = progress.ocrNext ?? 1;
  const total = Math.min(progress.ocrTotal ?? 0, OCR_PAGE_CAP);
  const needsOcr = Boolean(progress.needsOcr && nextPage <= total && deck.storagePath);

  if (!needsOcr) {
    return finishTitle(deckId);
  }

  const claimed = await claimOcrPage(deckId, nextPage);
  if (!claimed) {
    return { done: false, continue: true, deckId, status: "processing" };
  }

  try {
    const data = await downloadSourceMedia(deck.storagePath!);
    const page = await ocrPdfPage(data, nextPage, DEFAULT_OCR_MODEL);
    const combined = [deck.sourceContent, page.text].filter(Boolean).join("\n\n").trim();
    const nextProgress: IngestProgress = {
      ...progress,
      needsOcr: nextPage + 1 <= total,
      ocrNext: nextPage + 1,
      ocrBusy: false,
      inputTokens: (progress.inputTokens ?? 0) + page.usage.inputTokens,
      outputTokens: (progress.outputTokens ?? 0) + page.usage.outputTokens,
    };
    await saveIngestProgress(deckId, nextProgress, {
      sourceContent: combined.slice(0, 80_000) || undefined,
      generationStatus: "processing",
    });

    if (nextProgress.needsOcr) {
      enqueueNotebookProcess(deckId);
      return { done: false, continue: true, deckId, status: "processing" };
    }
    if (!combined.trim()) {
      await failAndRefund(
        deck.userId,
        deckId,
        nextProgress,
        "OCR found no readable text on these pages. Try a clearer scan, or paste the text.",
      );
      return {
        done: true,
        continue: false,
        deckId,
        status: "failed",
        error: "OCR found no readable text on these pages. Try a clearer scan, or paste the text.",
      };
    }
    return finishTitle(deckId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this source";
    const skippable = isTransientOcrError(error);
    const hasText = Boolean(deck.sourceContent?.trim());
    if (skippable && hasText) {
      const nextProgress: IngestProgress = {
        ...progress,
        needsOcr: false,
        ocrBusy: false,
        ocrNext: nextPage + 1,
      };
      await saveIngestProgress(deckId, nextProgress, { generationStatus: "processing" });
      return finishTitle(deckId);
    }
    await failAndRefund(deck.userId, deckId, progress, message);
    return { done: true, continue: false, deckId, status: "failed", error: message };
  }
}
