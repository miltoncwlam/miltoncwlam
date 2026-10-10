import "server-only";

import { extractImages, extractText, getDocumentProxy } from "unpdf";

import { MIN_PDF_TEXT_CHARS } from "@/lib/credits/config";

const MAX_SOURCE_CHARACTERS = 80_000;
const MAX_FIGURE_PAGES = 12;

/** pdf.js sums font sizes with Math.sumPrecise, which this Node does not ship. */
function ensurePdfMath() {
  const math = Math as Math & {
    sumPrecise?: (values: Iterable<number>) => number;
  };
  if (typeof math.sumPrecise === "function") return;
  math.sumPrecise = (values) => {
    let sum = 0;
    for (const value of values) {
      const n = +value;
      if (Number.isNaN(n)) return Number.NaN;
      sum += n;
    }
    return sum;
  };
}

/** A map, diagram, or timeline big enough to hide labels the text layer skips. */
export function isPdfFigureImage(image: { width: number; height: number }) {
  return image.width >= 500 || (image.width >= 350 && image.height >= 280);
}

/** Lines from a figure read that are not already in the selectable text. */
export function novelStudyLines(existing: string, extra: string) {
  const hay = existing.replace(/\s+/g, " ").toLowerCase();
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of extra.split(/\n+/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 8) continue;
    const key = line.toLowerCase();
    if (seen.has(key) || hay.includes(key)) continue;
    const words = key.split(/\s+/).filter((word) => word.length > 3);
    if (words.length >= 3) {
      const hit = words.filter((word) => hay.includes(word)).length;
      if (hit / words.length >= 0.75) continue;
    }
    seen.add(key);
    lines.push(line);
  }
  return lines.join("\n");
}

export function appendNovelStudyText(existing: string, extra: string) {
  const novel = novelStudyLines(existing, extra);
  return [existing.trim(), novel].filter(Boolean).join("\n\n").slice(0, MAX_SOURCE_CHARACTERS);
}

/** Pages whose pictures are large enough that the text layer is not the whole page. */
export async function listPdfFigurePages(data: Uint8Array): Promise<number[]> {
  ensurePdfMath();
  const pdf = await getDocumentProxy(data.slice());
  const found: { page: number; area: number }[] = [];
  for (let page = 1; page <= pdf.numPages; page += 1) {
    const images = await extractImages(data.slice(), page);
    const area = images
      .filter((image) => isPdfFigureImage(image))
      .reduce((sum, image) => sum + image.width * image.height, 0);
    if (area > 0) found.push({ page, area });
  }
  return found
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_FIGURE_PAGES)
    .map((item) => item.page)
    .sort((a, b) => a - b);
}

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
  ensurePdfMath();
  const pdfBytes = data.slice();
  const result = await extractText(pdfBytes, { mergePages: true });
  return {
    text: cleanText(result.text),
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
      return layer.text;
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
