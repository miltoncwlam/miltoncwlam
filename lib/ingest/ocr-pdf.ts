import "server-only";

import { generateText } from "ai";

import { MAX_OCR_PAGES } from "@/lib/credits/config";
import { pdfPagesToImages } from "@/lib/ingest/pdf-to-images";
import { getOpenRouterClient } from "@/lib/llm/config";
import { DEFAULT_OCR_MODEL } from "@/lib/llm/models";

const OCR_BATCH = 2;
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
    maxDimension: 1600,
  });
  const client = getOpenRouterClient();
  const model = client(modelId || DEFAULT_OCR_MODEL);
  const parts: string[] = [];
  let usage = { inputTokens: 0, outputTokens: 0 };

  for (let index = 0; index < pages.length; index += OCR_BATCH) {
    const batch = pages.slice(index, index + OCR_BATCH);
    const start = batch[0]?.pageNumber ?? index + 1;
    const end = batch[batch.length - 1]?.pageNumber ?? start;
    const result = await generateText({
      model,
      abortSignal: AbortSignal.timeout(50_000),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Transcribe ALL readable study text from scanned PDF page${batch.length === 1 ? "" : "s"} ${start}${end === start ? "" : `–${end}`}.
Keep the original language (Traditional/Simplified Chinese, English, or mixed).
Preserve headings, lists, and formulas as plain text. Do not summarize, translate, or invent words.
If a page is blank, output nothing for that page.`,
            },
            ...batch.map((page) => ({
              type: "image" as const,
              image: page.data,
              mediaType: page.mediaType,
            })),
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
  }

  const text = parts.join("\n\n").trim().slice(0, MAX_SOURCE);
  if (!text) {
    throw new Error(
      "OCR found no readable text on these pages. Try a clearer scan, or paste the text.",
    );
  }

  return { text, pageCount: pages.length, usage };
}
