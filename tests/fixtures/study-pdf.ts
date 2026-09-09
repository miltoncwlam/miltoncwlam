import { createCanvas } from "@napi-rs/canvas";

import { DETAILED_STUDY_PAGES } from "./test-sources";

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

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

function pageContentStream(lines: string[]) {
  const ops = ["BT /F1 11 Tf 56 740 Td 14 TL"];
  for (const line of lines) {
    ops.push(`(${pdfEscape(line)}) Tj T*`);
  }
  ops.push("ET");
  return ops.join("\n");
}

/** Selectable multi-page study PDF for create-notebook file ingest. */
export function detailedTextPdf(pages = DETAILED_STUDY_PAGES): Uint8Array {
  const fontObj = 3;
  const pageObjs = pages.map((_, index) => 4 + index * 2);
  const contentObjs = pages.map((_, index) => 5 + index * 2);
  const kids = pageObjs.map((id) => `${id} 0 R`).join(" ");
  const objects: Buffer[] = [
    Buffer.from("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"),
    Buffer.from(
      `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj\n`,
    ),
    Buffer.from(
      `${fontObj} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`,
    ),
  ];
  pages.forEach((lines, index) => {
    const pageId = pageObjs[index]!;
    const contentId = contentObjs[index]!;
    const stream = pageContentStream(lines);
    objects.push(
      Buffer.from(
        `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources<< /Font<< /F1 ${fontObj} 0 R >> >> >>endobj\n`,
      ),
    );
    objects.push(
      Buffer.from(
        `${contentId} 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
      ),
    );
  });
  return assemblePdf(objects);
}

async function scanJpegFromLines(lines: string[], width = 900, height = 1200) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f4ea";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "22px sans-serif";
  let y = 48;
  for (const line of lines) {
    ctx.fillText(line, 36, y);
    y += 28;
  }
  return Buffer.from(await canvas.encode("jpeg", 62));
}

/** Photo-style PDF (no text layer) for OCR / jpeg-extract tests. */
export async function detailedScanPdf(
  pages = DETAILED_STUDY_PAGES.slice(0, 2),
): Promise<Uint8Array> {
  const jpegs = await Promise.all(pages.map((lines) => scanJpegFromLines(lines)));
  const pageCount = jpegs.length;
  const fontObj = 3;
  const pageIds = pages.map((_, i) => 4 + i * 3);
  const imageIds = pages.map((_, i) => 5 + i * 3);
  const contentIds = pages.map((_, i) => 6 + i * 3);
  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const objects: Buffer[] = [
    Buffer.from("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"),
    Buffer.from(
      `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`,
    ),
    Buffer.from(
      `${fontObj} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`,
    ),
  ];
  jpegs.forEach((jpeg, index) => {
    const pageId = pageIds[index]!;
    const imageId = imageIds[index]!;
    const contentId = contentIds[index]!;
    const contents = `q 612 0 0 792 0 0 cm /Im${index} Do Q`;
    objects.push(
      Buffer.from(
        `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources<< /XObject<< /Im${index} ${imageId} 0 R >> >> >>endobj\n`,
      ),
    );
    objects.push(
      Buffer.concat([
        Buffer.from(
          `${imageId} 0 obj<< /Type /XObject /Subtype /Image /Width 900 /Height 1200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>stream\n`,
        ),
        jpeg,
        Buffer.from("\nendstream\nendobj\n"),
      ]),
    );
    objects.push(
      Buffer.from(
        `${contentId} 0 obj<< /Length ${contents.length} >>stream\n${contents}\nendstream\nendobj\n`,
      ),
    );
  });
  return assemblePdf(objects);
}
