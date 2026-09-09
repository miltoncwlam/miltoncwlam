import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { extractStudyText, isSparsePdfText, readPdfTextLayer } from "@/lib/ingest/extract-text";
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

  it("treats the scan fixture as a photo PDF", async () => {
    const scan = new Uint8Array(
      await readFile(fixturePath(TEST_FIXTURE_FILES.scanPdf)),
    );
    const layer = await readPdfTextLayer(scan);
    expect(isSparsePdfText(layer.text)).toBe(true);
    expect(layer.totalPages).toBeGreaterThanOrEqual(2);
  });
});
