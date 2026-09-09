import "server-only";

import { generateText } from "ai";

import { MAX_OCR_PAGES } from "@/lib/credits/config";
import { pdfPagesToImages } from "@/lib/ingest/pdf-to-images";
import { getOpenRouterClient } from "@/lib/llm/config";
import { DEFAULT_OCR_MODEL } from "@/lib/llm/models";

/** Leave room for title + refund inside notebooks `maxDuration` (180s). */
const OCR_BUDGET_MS = 140_000;
const OCR_PAGE_MS = 28_000;
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
    maxDimension: 1280,
  });
  const client = getOpenRouterClient();
  const model = client(modelId || DEFAULT_OCR_MODEL);
  const parts: string[] = [];
  let usage = { inputTokens: 0, outputTokens: 0 };
  let timedOut = false;
  const started = Date.now();

  for (const page of pages) {
    if (Date.now() - started > OCR_BUDGET_MS) {
      timedOut = true;
      break;
    }
    try {
      const result = await generateText({
        model,
        abortSignal: AbortSignal.timeout(OCR_PAGE_MS),
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
                image: page.data,
                mediaType: page.mediaType,
              },
            ],
          },
        ],
      });
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
