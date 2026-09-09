import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { friendlyGenerateError } from "@/lib/friendly-generate-error";
import {
  extractEmbeddedJpegs,
  pdfPagesToImages,
} from "@/lib/ingest/pdf-to-images";

function assemblePdf(objects: Buffer[]): Uint8Array {
  let body = Buffer.from("%PDF-1.4\n");
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body = Buffer.concat([body, object]);
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new Uint8Array(Buffer.concat([body, Buffer.from(xref)]));
}

/** Minimal one-page PDF with Helvetica text (exercises standard fonts). */
function textPdf(): Uint8Array {
  const content = "BT /F1 24 Tf 72 720 Td (Hello PDF) Tj ET";
  return assemblePdf([
    Buffer.from("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"),
    Buffer.from("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"),
    Buffer.from(
      "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    ),
    Buffer.from(
      `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`,
    ),
    Buffer.from("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n"),
  ]);
}

async function jpegScanPdf(
  width = 160,
  height = 90,
): Promise<{ pdf: Uint8Array; jpeg: Buffer }> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#111111";
  ctx.font = "24px sans-serif";
  ctx.fillText("Scan page", 16, 52);
  const jpeg = Buffer.from(await canvas.encode("jpeg", 80));
  const contents = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  return {
    jpeg,
    pdf: assemblePdf([
      Buffer.from("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"),
      Buffer.from("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"),
      Buffer.from(
        `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R /Resources<< /XObject<< /Im0 4 0 R >> >> >>endobj\n`,
      ),
      Buffer.concat([
        Buffer.from(
          `4 0 obj<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>stream\n`,
        ),
        jpeg,
        Buffer.from("\nendstream\nendobj\n"),
      ]),
      Buffer.from(
        `5 0 obj<< /Length ${contents.length} >>stream\n${contents}\nendstream\nendobj\n`,
      ),
    ]),
  };
}

describe("pdfPagesToImages", () => {
  it("rasterizes a text PDF page to a JPEG for OCR", async () => {
    const pages = await pdfPagesToImages(textPdf());
    expect(pages.length).toBe(1);
    expect(pages[0].mediaType).toBe("image/jpeg");
    expect(pages[0].data.byteLength).toBeGreaterThan(100);
    expect(Array.from(pages[0].data.slice(0, 2))).toEqual([0xff, 0xd8]);
  }, 30_000);

  it("reads a JPEG scan without treating stream length as a filesystem path", async () => {
    const { pdf, jpeg } = await jpegScanPdf();
    const embedded = extractEmbeddedJpegs(pdf);
    expect(embedded.length).toBe(1);
    expect(embedded[0].byteLength).toBe(jpeg.length);
    expect(Array.from(embedded[0].slice(0, 2))).toEqual([0xff, 0xd8]);

    const pages = await pdfPagesToImages(pdf);
    expect(pages.length).toBe(1);
    expect(pages[0].mediaType).toBe("image/jpeg");
    expect(pages[0].data.byteLength).toBe(jpeg.length);
    expect(pages[0].data.byteOffset).toBe(0);
    expect(pages[0].data.buffer.byteLength).toBe(pages[0].data.byteLength);
  }, 30_000);

  it("shrinks large scan JPEGs so OCR payloads stay small", async () => {
    const { pdf, jpeg } = await jpegScanPdf(1800, 1200);
    expect(jpeg.byteLength).toBeGreaterThan(8_000);
    const pages = await pdfPagesToImages(pdf, { maxDimension: 400 });
    expect(pages[0].mediaType).toBe("image/jpeg");
    expect(Array.from(pages[0].data.slice(0, 2))).toEqual([0xff, 0xd8]);
    expect(pages[0].data.byteLength).toBeLessThan(jpeg.byteLength);
  }, 30_000);
});

describe("friendlyGenerateError", () => {
  it("hides Node path-type failures from scanned PDFs", () => {
    expect(
      friendlyGenerateError(
        'The "path" argument must be of type string. Received type number (55876)',
      ),
    ).toMatch(/photo of a page/i);
  });

  it("explains OCR timeouts on scans", () => {
    expect(
      friendlyGenerateError(
        "Reading this scan took too long. Try fewer pages, or paste the text.",
      ),
    ).toMatch(/fewer pages/i);
  });

  it("prompts guests to create an account when the trial is used up", () => {
    expect(
      friendlyGenerateError("Guest trial is used up.", "GUEST_QUOTA"),
    ).toMatch(/create a free account/i);
  });
});

