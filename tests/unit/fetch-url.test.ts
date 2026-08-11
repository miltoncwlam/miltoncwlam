import { describe, expect, it } from "vitest";

import { fetchStudyTextFromUrl } from "@/lib/ingest/fetch-url";

describe("fetchStudyTextFromUrl SSRF guards", () => {
  it("blocks localhost", async () => {
    await expect(
      fetchStudyTextFromUrl("http://localhost/secret"),
    ).rejects.toThrow(/not allowed|Private/i);
  });

  it("blocks private IPs", async () => {
    await expect(
      fetchStudyTextFromUrl("http://127.0.0.1/secret"),
    ).rejects.toThrow(/Private|not allowed/i);
  });

  it("rejects non-http schemes", async () => {
    await expect(fetchStudyTextFromUrl("file:///etc/passwd")).rejects.toThrow(
      /http/i,
    );
  });
});
