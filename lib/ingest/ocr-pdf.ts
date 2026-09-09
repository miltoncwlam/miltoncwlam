import "server-only";

import { generateText } from "ai";

import { MAX_OCR_PAGES } from "@/lib/credits/config";
import { fitPageImage, pdfPagesToImages } from "@/lib/ingest/pdf-to-images";
import { getOpenRouterClient } from "@/lib/llm/config";
import { DEFAULT_OCR_MODEL } from "@/lib/llm/models";

/** Leave room for title + refund inside notebooks `maxDuration` (180s). */
const OCR_BUDGET_MS = 150_000;
const OCR_FIRST_PAGE_MS = 80_000;
const OCR_PAGE_MS = 50_000;
const OCR_RETRY_MS = 40_000;
const OCR_RETRY_DIMENSION = 720;
const MAX_SOURCE = 80_000;

function readUsage(result: {
  usage?: {
    inputTokens?: { total?: number } | number;
    outputTokens?: { total?: number } | number;
  };
}) {
  const input = result.usage?.inputTokens;
  const output = result.usage?.outputTokens;
  const inputTokens =
    typeof input === "number" ? input : Number(input?.total ?? 0);
  const outputTokens =
    typeof output === "number" ? output : Number(output?.total ?? 0);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  };
}

function isAbortError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return /aborted|timeout|TimeoutError|AbortError/i.test(`${name} ${message}`);
}

function remainingMs(started: number) {
  return OCR_BUDGET_MS - (Date.now() - started);
}

async function transcribePage(
  model: ReturnType<ReturnType<typeof getOpenRouterClient>>,
  page: Awaited<ReturnType<typeof pdfPagesToImages>>[number],
  timeoutMs: number,
) {
  return generateText({
    model,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(timeoutMs),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Transcribe ALL readable study text from scanned PDF page ${page.pageNumber}.
Keep the original language (Traditional/Simplified Chinese, English, or mixed).
Preserve headings, lists, and formulas as plain text. Do not summarize, translate, or invent words.
If a page is blank, output nothing.`,
          },
          {
            type: "image" as const,
            image: Buffer.from(page.data),
            mediaType: page.mediaType,
          },
        ],
      },
    ],
  });
}

export async function ocrPdfPages(
  data: Uint8Array,
  modelId = DEFAULT_OCR_MODEL,
): Promise<{
  text: string;
  pageCount: number;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const pages = await pdfPagesToImages(data, {
    maxPages: MAX_OCR_PAGES,
    maxDimension: 1024,
  });
  const client = getOpenRouterClient();
  const model = client(modelId || DEFAULT_OCR_MODEL);
  const parts: string[] = [];
  let usage = { inputTokens: 0, outputTokens: 0 };
  let timedOut = false;
  const started = Date.now();

  for (const [index, page] of pages.entries()) {
    const leftover = remainingMs(started);
    if (leftover < 12_000) {
      timedOut = true;
      break;
    }
    const timeoutMs = Math.max(
      12_000,
      Math.min(index === 0 ? OCR_FIRST_PAGE_MS : OCR_PAGE_MS, leftover - 8_000),
    );
    try {
      const result = await transcribePage(model, page, timeoutMs);
      const chunk = result.text.trim();
      if (chunk) parts.push(chunk);
      const used = readUsage(result);
      usage = {
        inputTokens: usage.inputTokens + used.inputTokens,
        outputTokens: usage.outputTokens + used.outputTokens,
      };
    } catch (error) {
      if (!isAbortError(error)) throw error;
      timedOut = true;
      const retryBudget = remainingMs(started);
      if (retryBudget < 12_000) break;
      try {
        const smaller = await fitPageImage(page, OCR_RETRY_DIMENSION, 50);
        const result = await transcribePage(
          model,
          smaller,
          Math.min(OCR_RETRY_MS, retryBudget - 5_000),
        );
        const chunk = result.text.trim();
        if (chunk) {
          parts.push(chunk);
          timedOut = false;
        }
        const used = readUsage(result);
        usage = {
          inputTokens: usage.inputTokens + used.inputTokens,
          outputTokens: usage.outputTokens + used.outputTokens,
        };
      } catch (retryError) {
        if (!isAbortError(retryError)) throw retryError;
        if (parts.length) break;
      }
    }
  }

  const text = parts.join("\n\n").trim().slice(0, MAX_SOURCE);
  if (!text) {
    throw new Error(
      timedOut
        ? "Reading this scan took too long. Try fewer pages, or paste the text."
        : "OCR found no readable text on these pages. Try a clearer scan, or paste the text.",
    );
  }

  return { text, pageCount: pages.length, usage };
}
