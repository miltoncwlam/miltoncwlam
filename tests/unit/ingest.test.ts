import { describe, expect, it } from "vitest";

import { extractStudyText } from "@/lib/ingest/extract-text";
import {
  assertOwnedStoragePath,
  validateFileSignature,
  validateUpload,
} from "@/lib/ingest/validate-upload";

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
      validateUpload({ name: "notes.pdf", type: "image/png", size: 200 }),
    ).toThrow(/extension/i);
  });

  it("enforces storage ownership", () => {
    expect(() => assertOwnedStoragePath("other/file.pdf", "user")).toThrow();
    expect(() => assertOwnedStoragePath("user/file.pdf", "user")).not.toThrow();
  });

  it("checks image signatures", () => {
    expect(() =>
      validateFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png"),
    ).not.toThrow();
    expect(() =>
      validateFileSignature(new Uint8Array([1, 2, 3]), "image/png"),
    ).toThrow(/valid PNG/);
  });

  it("extracts and normalizes plain text", async () => {
    const data = new TextEncoder().encode("  Useful notes \n\n ");
    await expect(extractStudyText(data, "text/plain")).resolves.toBe(
      "Useful notes",
    );
  });
});
