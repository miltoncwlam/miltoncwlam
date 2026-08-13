import { describe, expect, it } from "vitest";

import { estimateInputTokens, estimateOutputTokens } from "@/lib/credits/estimate-generation";

describe("token estimates", () => {
  it("gives topic the smallest input", () => {
    const topic = estimateInputTokens("topic", { charCount: 20 });
    const text = estimateInputTokens("text", { charCount: 2000 });
    const url = estimateInputTokens("url", { charCount: 2000 });
    const file = estimateInputTokens("file", {
      mimeType: "application/pdf",
      scannedPdf: true,
      charCount: 0,
    });
    expect(topic).toBeLessThan(text);
    expect(text).toBeLessThan(url);
    expect(file).toBeGreaterThan(url);
  });

  it("scales output with card count", () => {
    expect(estimateOutputTokens(8)).toBe(8 * 180 + 200);
    expect(estimateOutputTokens(3)).toBe(3 * 180 + 200);
  });
});
