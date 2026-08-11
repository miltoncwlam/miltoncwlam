import "server-only";

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createIsomorphicCanvasFactory,
  getDocumentProxy,
} from "unpdf";

const require = createRequire(import.meta.url);

const MAX_PAGES = 8;
const MAX_DIMENSION = 1280;

export type PdfPageImage = {
  data: Uint8Array;
  mediaType: "image/png";
  pageNumber: number;
};

function pdfjsAssetOptions() {
  const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
  return {
    disableFontFace: true,
    useSystemFonts: true,
    standardFontDataUrl: pathToFileURL(
      join(pdfjsRoot, "standard_fonts") + "/",
    ).href,
    cMapUrl: pathToFileURL(join(pdfjsRoot, "cmaps") + "/").href,
    cMapPacked: true as const,
  };
}

async function injectRealCanvasGlobals() {
  const canvas = await import("@napi-rs/canvas");
  // unpdf stubs Path2D for import, then only replaces it when undefined —
  // so we always overwrite with the real napi-rs constructors.
  globalThis.Path2D = canvas.Path2D as unknown as typeof Path2D;
  globalThis.DOMMatrix = canvas.DOMMatrix as unknown as typeof DOMMatrix;
  globalThis.ImageData = canvas.ImageData as unknown as typeof ImageData;
  return canvas;
}

export async function pdfPagesToImages(
  data: Uint8Array,
): Promise<PdfPageImage[]> {
  await injectRealCanvasGlobals();

  const pdfBytes = new Uint8Array(data);
  const pdf = await getDocumentProxy(pdfBytes, pdfjsAssetOptions());
  const CanvasFactory = await createIsomorphicCanvasFactory(
    () => import("@napi-rs/canvas"),
  );
  // Inject again after unpdf's factory setup (it may re-stub).
  await injectRealCanvasGlobals();

  const pageCount = Math.min(pdf.numPages, MAX_PAGES);
  const images: PdfPageImage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        MAX_DIMENSION / Math.max(baseViewport.width, baseViewport.height),
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
          canvasContext: drawingContext.context as unknown as CanvasRenderingContext2D,
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

  if (!images.length) {
    throw new Error("Could not convert any PDF pages to images");
  }

  return images;
}
