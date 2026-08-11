import { describe, expect, it } from "vitest";

import { pdfPagesToImages } from "@/lib/ingest/pdf-to-images";

/** Minimal one-page PDF with Helvetica text (exercises standard fonts). */
function textPdf(): Uint8Array {
  const content = "BT /F1 24 Tf 72 720 Td (Hello PDF) Tj ET";
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefStart = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body));
}

describe("pdfPagesToImages", () => {
  it("rasterizes a text PDF page to PNG without font Path errors", async () => {
    const pages = await pdfPagesToImages(textPdf());
    expect(pages.length).toBe(1);
    expect(pages[0].mediaType).toBe("image/png");
    expect(pages[0].data.byteLength).toBeGreaterThan(100);
    expect(Array.from(pages[0].data.slice(0, 4))).toEqual([137, 80, 78, 71]);
  }, 30_000);
});
