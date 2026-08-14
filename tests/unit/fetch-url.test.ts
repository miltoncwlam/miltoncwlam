import { describe, expect, it } from "vitest";

import { fetchStudyTextFromUrl, readResponseBytes } from "@/lib/ingest/fetch-url";

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

describe("readResponseBytes", () => {
  it("keeps a small body intact", async () => {
    const response = new Response("hello study", {
      headers: { "content-type": "text/html" },
    });
    const { buffer, truncated } = await readResponseBytes(response, 1000);
    expect(truncated).toBe(false);
    expect(buffer.toString("utf8")).toBe("hello study");
  });

  it("stops reading after the byte cap instead of failing", async () => {
    const body = "Photosynthesis converts light into sugar. ".repeat(200);
    const response = new Response(body, {
      headers: { "content-type": "text/html" },
    });
    const { buffer, truncated } = await readResponseBytes(response, 80);
    expect(truncated).toBe(true);
    expect(buffer.byteLength).toBe(80);
    expect(buffer.toString("utf8")).toContain("Photosynthesis");
  });
});
