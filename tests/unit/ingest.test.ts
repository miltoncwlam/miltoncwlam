import { describe, expect, it } from "vitest";

import { extractStudyText } from "@/lib/ingest/extract-text";
import {
  assertOwnedStoragePath,
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
});
