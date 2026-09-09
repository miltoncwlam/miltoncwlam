import { describe, expect, it } from "vitest";

import { MAX_FILE_INPUT_TOKENS } from "@/lib/credits/config";
import {
  estimateArtifactCredits,
  estimateInputTokens,
  estimateOcrCredits,
  estimateOutputTokens,
} from "@/lib/credits/estimate-generation";
import { ENERGY_GIFT_CODE, giftCodeMatches } from "@/lib/credits/gift-code";

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

  it("does not treat a large PDF as millions of tokens", () => {
    const tokens = estimateInputTokens("file", {
      mimeType: "application/pdf",
      fileBytes: 6_000_000,
    });
    expect(tokens).toBeLessThanOrEqual(2_000 + MAX_FILE_INPUT_TOKENS);
  });

  it("prices notebook ingest like a short title call", () => {
    const ingest = estimateArtifactCredits({
      provider: "openrouter",
      modelId: "deepseek/deepseek-v4-flash",
      sourceMode: "file",
      sourceSize: { mimeType: "application/pdf", fileBytes: 6_000_000 },
      kind: "ingest",
    });
    expect(ingest.textCredits).toBeLessThan(50);
  });

  it("prices OCR by page and stays under a weekly grant", () => {
    const ocr = estimateOcrCredits({
      provider: "openrouter",
      modelId: "qwen/qwen3.7-flash",
      pageCount: 10,
    });
    expect(ocr.textCredits).toBeGreaterThan(10);
    expect(ocr.textCredits).toBeLessThan(600);
  });

  it("scales output with card count", () => {
    expect(estimateOutputTokens(8)).toBe(8 * 180 + 200);
    expect(estimateOutputTokens(3)).toBe(3 * 180 + 200);
  });
});

describe("gift code", () => {
  it("accepts the reusable energy code and rejects near-misses", () => {
    expect(giftCodeMatches(ENERGY_GIFT_CODE)).toBe(true);
    expect(giftCodeMatches(` ${ENERGY_GIFT_CODE} `)).toBe(true);
    expect(giftCodeMatches("30624701")).toBe(false);
    expect(giftCodeMatches("")).toBe(false);
  });
});
