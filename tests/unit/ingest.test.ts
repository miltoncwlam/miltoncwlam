import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractStudyText, isSparsePdfText, readPdfTextLayer } from "@/lib/ingest/extract-text";
import { OCR_PAGE_CAP } from "@/lib/ingest/ocr-pdf";
import { MAX_OCR_PAGES } from "@/lib/credits/config";
import {
  assertOwnedStoragePath,
  validateUpload,
} from "@/lib/ingest/validate-upload";
import { detailedTextPdf } from "@/tests/fixtures/study-pdf";
import {
  TEST_FIXTURE_FILES,
  fixturePath,
} from "@/tests/fixtures/test-sources";

describe("source ingestion", () => {
  it("OCRs up to the advertised page cap, one page per tick", () => {
    expect(OCR_PAGE_CAP).toBe(MAX_OCR_PAGES);
    expect(OCR_PAGE_CAP).toBe(10);
  });
  it("accepts matching allowed uploads", () => {
    expect(
      validateUpload({
        name: "notes.md",
        type: "text/markdown",
        size: 200,
      }).sourceType,
    ).toBe("file");
  });

  it("rejects extension and MIME mismatches", () => {
    expect(() =>
      validateUpload({ name: "notes.pdf", type: "text/plain", size: 200 }),
    ).toThrow(/extension/i);
  });

  it("enforces storage ownership", () => {
    expect(() => assertOwnedStoragePath("other/file.pdf", "user")).toThrow();
    expect(() => assertOwnedStoragePath("user/file.pdf", "user")).not.toThrow();
  });

  it("extracts and normalizes plain text", async () => {
    const data = new TextEncoder().encode("  Useful notes \n\n ");
    await expect(extractStudyText(data, "text/plain")).resolves.toBe(
      "Useful notes",
    );
  });

  it("treats very short PDF layers as scans", () => {
    expect(isSparsePdfText("")).toBe(true);
    expect(isSparsePdfText("ab")).toBe(true);
    expect(isSparsePdfText("A".repeat(80))).toBe(false);
  });

  it("extracts the detailed photosynthesis study PDF", async () => {
    const generated = detailedTextPdf();
    const fromDisk = new Uint8Array(
      await readFile(fixturePath(TEST_FIXTURE_FILES.detailedPdf)),
    );
    const text = await extractStudyText(generated, "application/pdf");
    expect(text).toMatch(/Calvin cycle/i);
    expect(text).toMatch(/chlorophyll/i);
    expect(text).toMatch(/limiting factor/i);
    expect(text.length).toBeGreaterThan(800);
    const diskText = await extractStudyText(fromDisk, "application/pdf");
    expect(diskText).toMatch(/photolysis/i);
  });

  it("enqueues auto-notes after ingest completes", async () => {
    const job = await readFile("lib/ingest/notebook-job.ts", "utf8");
    expect(job).toMatch(/api\/decks\/\$\{deckId\}\/artifacts/);
    expect(job).toMatch(/kind: "notes"/);
    const proxy = await readFile("proxy.ts", "utf8");
    expect(proxy).toMatch(/isIngestJobApiRequest/);
    expect(proxy).toMatch(/artifacts/);
  });

  it("treats the S1 Chinese History L1.1 scan as a photo PDF", async () => {
    const historyPdf = join(
      process.cwd(),
      "S1 CH L1.1 中華民族與早期國家的起源.pdf",
    );
    if (!existsSync(historyPdf)) return;
    const scan = new Uint8Array(await readFile(historyPdf));
    const layer = await readPdfTextLayer(scan);
    expect(isSparsePdfText(layer.text)).toBe(true);
    expect(layer.totalPages).toBe(12);
  });

  it("treats the scan fixture as a photo PDF", async () => {
    const scan = new Uint8Array(
      await readFile(fixturePath(TEST_FIXTURE_FILES.scanPdf)),
    );
    const layer = await readPdfTextLayer(scan);
    expect(isSparsePdfText(layer.text)).toBe(true);
    expect(layer.totalPages).toBeGreaterThanOrEqual(2);
  });
});
