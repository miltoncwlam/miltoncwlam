import "server-only";

import { generateText } from "ai";

import { MAX_OCR_PAGES } from "@/lib/credits/config";
import { fitPageImage, pdfPagesToImages } from "@/lib/ingest/pdf-to-images";
import { DEFAULT_OCR_MODEL } from "@/lib/llm/models";

const OCR_BUDGET_MS = 125_000;
const OCR_FIRST_PAGE_MS = 80_000;
const OCR_PAGE_MS = 70_000;
const OCR_RETRY_MS = 45_000;
const OCR_RETRY_DIMENSION = 640;
const OCR_FIRST_DIMENSION = 768;
const MAX_SOURCE = 80_000;
/** One page per serverless tick, so we can use the advertised page cap. */
export const OCR_PAGE_CAP = MAX_OCR_PAGES;

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

export function isTransientOcrError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return /aborted|timeout|TimeoutError|AbortError|Invalid JSON response|invalid json|JSONParse|APICallError|EmptyResponse|NoContentGenerated/i.test(
    `${name} ${message}`,
  );
}

function remainingMs(started: number) {
  return OCR_BUDGET_MS - (Date.now() - started);
}

/** Avoid Buffer — JSON.stringify(Buffer) can blow up the OpenRouter body. */
export function pageImageDataUrl(page: {
  data: Uint8Array;
  mediaType: string;
}) {
  const bytes = Uint8Array.from(page.data);
  return `data:${page.mediaType};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function transcribePage(
  model: Parameters<typeof generateText>[0]["model"],
  page: {
    data: Uint8Array;
    mediaType: string;
    pageNumber: number;
  },
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
            type: "file" as const,
            mediaType: page.mediaType,
            data: Uint8Array.from(page.data),
          },
        ],
      },
    ],
  });
}

export async function ocrPdfPage(
  data: Uint8Array,
  pageNumber: number,
  modelId = DEFAULT_OCR_MODEL,
): Promise<{
  text: string;
  pageNumber: number;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const pages = await pdfPagesToImages(data, {
    pageNumber,
    maxPages: pageNumber,
    maxDimension: OCR_FIRST_DIMENSION,
  });
  const page = pages[0];
  if (!page) {
    throw new Error("Could not convert any PDF pages to images");
  }
  const { getOpenRouterClient } = await import("@/lib/llm/config");
  const client = getOpenRouterClient();
  const model = client(modelId || DEFAULT_OCR_MODEL);
  try {
    const result = await transcribePage(model, page, OCR_PAGE_MS);
    const used = readUsage(result);
    return {
      text: result.text.trim(),
      pageNumber: page.pageNumber,
      usage: used,
    };
  } catch (error) {
    if (!isTransientOcrError(error)) throw error;
    const smaller = await fitPageImage(page, OCR_RETRY_DIMENSION, 45);
    const result = await transcribePage(model, smaller, OCR_RETRY_MS);
    const used = readUsage(result);
    return {
      text: result.text.trim(),
      pageNumber: page.pageNumber,
      usage: used,
    };
  }
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
    maxPages: OCR_PAGE_CAP,
    maxDimension: OCR_FIRST_DIMENSION,
  });
  const { getOpenRouterClient } = await import("@/lib/llm/config");
  const client = getOpenRouterClient();
  const model = client(modelId || DEFAULT_OCR_MODEL);
  const parts: string[] = [];
  let usage = { inputTokens: 0, outputTokens: 0 };
  let timedOut = false;
  const started = Date.now();

  for (const [index, page] of pages.entries()) {
    const leftover = remainingMs(started);
    if (parts.length && (leftover < 40_000 || Date.now() - started > 50_000)) {
      break;
    }
    if (leftover < 15_000) {
      timedOut = true;
      break;
    }
    const timeoutMs = Math.max(
      15_000,
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
      if (parts.length && (remainingMs(started) < 40_000 || Date.now() - started > 50_000)) {
        break;
      }
    } catch (error) {
      if (!isTransientOcrError(error)) throw error;
      timedOut = true;
      const retryBudget = remainingMs(started);
      if (retryBudget < 15_000) {
        if (parts.length) break;
        continue;
      }
      try {
        const smaller = await fitPageImage(page, OCR_RETRY_DIMENSION, 45);
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
        if (!isTransientOcrError(retryError)) throw retryError;
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
