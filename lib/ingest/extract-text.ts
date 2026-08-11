import "server-only";

import { extractText } from "unpdf";

const MAX_PDF_PAGES = 50;
const MAX_SOURCE_CHARACTERS = 80_000;

function normalizeText(text: string) {
  const normalized = text.replace(/\0/g, "").replace(/\s+\n/g, "\n").trim();

  if (!normalized) throw new Error("No readable text was found in this source");
  return normalized.slice(0, MAX_SOURCE_CHARACTERS);
}

export async function extractStudyText(
  data: Uint8Array,
  mimeType: string,
): Promise<string> {
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return normalizeText(new TextDecoder("utf-8", { fatal: true }).decode(data));
  }

  if (mimeType === "application/pdf") {
    const pdfBytes = new Uint8Array(data);
    const result = await extractText(pdfBytes, { mergePages: true });
    if (result.totalPages > MAX_PDF_PAGES) {
      throw new Error(`PDF files are limited to ${MAX_PDF_PAGES} pages`);
    }
    return normalizeText(result.text);
  }

  throw new Error("This source type does not contain directly extractable text");
}
