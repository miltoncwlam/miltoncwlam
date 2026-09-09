import "server-only";

import { extractText } from "unpdf";

import { MIN_PDF_TEXT_CHARS } from "@/lib/credits/config";

const MAX_PDF_PAGES = 50;
const MAX_SOURCE_CHARACTERS = 80_000;

export function isSparsePdfText(text: string) {
  return text.trim().length < MIN_PDF_TEXT_CHARS;
}

function cleanText(text: string) {
  return text.replace(/\0/g, "").replace(/\s+\n/g, "\n").trim();
}

function normalizeText(text: string, mimeType?: string) {
  const normalized = cleanText(text);

  if (!normalized) {
    if (mimeType === "application/pdf") {
      throw new Error(
        "This PDF has no selectable text (likely a scan). Paste the text or OCR it first, then try again.",
      );
    }
    throw new Error("No readable text was found in this source");
  }
  return normalized.slice(0, MAX_SOURCE_CHARACTERS);
}

export async function readPdfTextLayer(data: Uint8Array): Promise<{
  text: string;
  totalPages: number;
}> {
  const pdfBytes = new Uint8Array(data);
  const result = await extractText(pdfBytes, { mergePages: true });
  if (result.totalPages > MAX_PDF_PAGES) {
    throw new Error(`PDF files are limited to ${MAX_PDF_PAGES} pages`);
  }
  return {
    text: cleanText(result.text).slice(0, MAX_SOURCE_CHARACTERS),
    totalPages: result.totalPages,
  };
}

export async function extractStudyText(
  data: Uint8Array,
  mimeType: string,
  options?: { ocr?: boolean; model?: string },
): Promise<string> {
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return normalizeText(
      new TextDecoder("utf-8", { fatal: true }).decode(data),
      mimeType,
    );
  }

  if (mimeType === "application/pdf") {
    const layer = await readPdfTextLayer(data);
    if (!isSparsePdfText(layer.text)) {
      return layer.text.slice(0, MAX_SOURCE_CHARACTERS);
    }
    if (options?.ocr) {
      const { ocrPdfPages } = await import("@/lib/ingest/ocr-pdf");
      const ocr = await ocrPdfPages(data, options.model);
      return ocr.text;
    }
    throw new Error(
      "This PDF has no selectable text (likely a scan). Paste the text or OCR it first, then try again.",
    );
  }

  throw new Error("This source type does not contain directly extractable text");
}
