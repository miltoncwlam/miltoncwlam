import "server-only";

import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { createCanvas, ImageData as CanvasImageData } from "@napi-rs/canvas";
import {
  createIsomorphicCanvasFactory,
  extractImages,
  getDocumentProxy,
} from "unpdf";

const require = createRequire(import.meta.url);

const DEFAULT_MAX_PAGES = 8;
const DEFAULT_MAX_DIMENSION = 1280;
const MIN_JPEG_BYTES = 400;

export type PdfPageImage = {
  data: Uint8Array;
  mediaType: "image/png" | "image/jpeg";
  pageNumber: number;
};

function pdfjsNodeOptions() {
  const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  return {
    disableFontFace: true,
    useSystemFonts: true,
    // Node's fs.readFile wants filesystem paths, not file:// URLs.
    standardFontDataUrl: join(pdfjsRoot, "standard_fonts") + "/",
    cMapUrl: join(pdfjsRoot, "cmaps") + "/",
    cMapPacked: true as const,
  };
}

async function injectRealCanvasGlobals() {
  const canvas = await import("@napi-rs/canvas");
  globalThis.Path2D = canvas.Path2D as unknown as typeof Path2D;
  globalThis.DOMMatrix = canvas.DOMMatrix as unknown as typeof DOMMatrix;
  globalThis.ImageData = canvas.ImageData as unknown as typeof ImageData;
}

/** Pull DCTDecode JPEG streams out of a PDF without asking pdf.js to rasterize. */
export function extractEmbeddedJpegs(pdf: Uint8Array): Uint8Array[] {
  const src = Buffer.from(pdf).toString("latin1");
  const out: Uint8Array[] = [];
  const dictRe = /<<[\s\S]{0,1200}?>>/g;
  let match: RegExpExecArray | null;
  while ((match = dictRe.exec(src))) {
    const dict = match[0];
    if (!/\/DCTDecode\b/.test(dict)) continue;
    const lengthMatch = dict.match(/\/Length\s+(\d+)\b/);
    if (!lengthMatch) continue;
    const length = Number(lengthMatch[1]);
    const after = src.slice(match.index + dict.length);
    const streamMatch = after.match(/^\s*stream\r?\n/);
    if (!streamMatch) continue;
    const start = match.index + dict.length + streamMatch[0].length;
    if (!Number.isFinite(length) || length < MIN_JPEG_BYTES) continue;
    if (start + length > pdf.length) continue;
    const slice = pdf.subarray(start, start + length);
    if (slice[0] === 0xff && slice[1] === 0xd8) {
      out.push(slice);
    }
  }
  if (out.length) return out;

  // Fallback when /Length is an indirect object (`12 0 R`) so the dict parse misses.
  let index = 0;
  while (index < pdf.length - 1) {
    if (pdf[index] !== 0xff || pdf[index + 1] !== 0xd8) {
      index += 1;
      continue;
    }
    const start = index;
    let end = -1;
    for (let cursor = start + 2; cursor < pdf.length - 1; cursor += 1) {
      if (pdf[cursor] === 0xff && pdf[cursor + 1] === 0xd9) {
        end = cursor + 2;
        break;
      }
    }
    if (end > 0 && end - start >= 8_000) {
      out.push(pdf.subarray(start, end));
      index = end;
    } else {
      index = start + 2;
    }
  }
  return out;
}

function rawImageToPng(img: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  channels: 1 | 3 | 4;
}): Uint8Array {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  let rgba: Uint8ClampedArray;
  if (img.channels === 4) {
    rgba = new Uint8ClampedArray(img.data);
  } else if (img.channels === 3) {
    rgba = new Uint8ClampedArray(img.width * img.height * 4);
    for (let i = 0, j = 0; i < img.data.length; i += 3, j += 4) {
      rgba[j] = img.data[i]!;
      rgba[j + 1] = img.data[i + 1]!;
      rgba[j + 2] = img.data[i + 2]!;
      rgba[j + 3] = 255;
    }
  } else {
    rgba = new Uint8ClampedArray(img.width * img.height * 4);
    for (let i = 0, j = 0; i < img.data.length; i += 1, j += 4) {
      const value = img.data[i]!;
      rgba[j] = value;
      rgba[j + 1] = value;
      rgba[j + 2] = value;
      rgba[j + 3] = 255;
    }
  }
  ctx.putImageData(new CanvasImageData(rgba, img.width, img.height), 0, 0);
  return new Uint8Array(canvas.encodeSync("png"));
}

async function destroyPdf(pdf: {
  cleanup?: () => Promise<unknown>;
  loadingTask?: { destroy?: () => Promise<unknown> };
}) {
  try {
    await pdf.cleanup?.();
  } catch {
    // ignore
  }
  try {
    await pdf.loadingTask?.destroy?.();
  } catch {
    // ignore
  }
}

async function pagesFromExtractedImages(
  data: Uint8Array,
  maxPages: number,
): Promise<PdfPageImage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(data), pdfjsNodeOptions());
  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: PdfPageImage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const extracted = await extractImages(pdf, pageNumber);
      const scan = extracted.reduce<(typeof extracted)[0] | null>(
        (best, img) => {
          if (!best) return img;
          return img.width * img.height > best.width * best.height ? img : best;
        },
        null,
      );
      if (!scan) continue;
      images.push({
        data: rawImageToPng(scan),
        mediaType: "image/png",
        pageNumber,
      });
    }
  } finally {
    await destroyPdf(pdf);
  }
  return images;
}

async function pagesFromRender(
  data: Uint8Array,
  maxPages: number,
  maxDimension: number,
): Promise<PdfPageImage[]> {
  await injectRealCanvasGlobals();
  const pdfBytes = new Uint8Array(data);
  const pdf = await getDocumentProxy(pdfBytes, pdfjsNodeOptions());
  const CanvasFactory = await createIsomorphicCanvasFactory(
    () => import("@napi-rs/canvas"),
  );
  await injectRealCanvasGlobals();
  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: PdfPageImage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        maxDimension / Math.max(baseViewport.width, baseViewport.height),
      );
      const viewport = page.getViewport({ scale });
      const canvasFactory = new CanvasFactory();
      const drawingContext = canvasFactory.create(
        viewport.width,
        viewport.height,
      );
      try {
        await page.render({
          canvas: drawingContext.canvas as unknown as HTMLCanvasElement,
          canvasContext:
            drawingContext.context as unknown as CanvasRenderingContext2D,
          viewport,
        }).promise;
        const { canvas } = drawingContext;
        if (!("encode" in canvas) || typeof canvas.encode !== "function") {
          throw new Error("Canvas encode is unavailable for PDF rendering");
        }
        const png = await canvas.encode("png");
        images.push({
          data: new Uint8Array(png),
          mediaType: "image/png",
          pageNumber,
        });
      } finally {
        canvasFactory.destroy(drawingContext);
      }
    }
  } finally {
    await destroyPdf(pdf);
  }
  return images;
}

function isPathTypeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /path["'] argument must be of type string/i.test(message);
}

export async function pdfPagesToImages(
  data: Uint8Array,
  options: { maxPages?: number; maxDimension?: number } = {},
): Promise<PdfPageImage[]> {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES);
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;

  const jpegs = extractEmbeddedJpegs(data).slice(0, maxPages);
  if (jpegs.length) {
    return jpegs.map((jpeg, index) => ({
      data: jpeg,
      mediaType: "image/jpeg" as const,
      pageNumber: index + 1,
    }));
  }

  try {
    const extracted = await pagesFromExtractedImages(data, maxPages);
    if (extracted.length) return extracted;
  } catch (error) {
    if (!isPathTypeError(error)) throw error;
  }

  try {
    const rendered = await pagesFromRender(data, maxPages, maxDimension);
    if (rendered.length) return rendered;
  } catch (error) {
    if (isPathTypeError(error)) {
      throw new Error(
        "Could not read this scanned PDF. Try another file, or paste the text.",
      );
    }
    throw error;
  }

  throw new Error("Could not convert any PDF pages to images");
}
