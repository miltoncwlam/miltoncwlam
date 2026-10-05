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
      modelId: "deepseek/deepseek-v4-flash-0731",
      sourceMode: "file",
      sourceSize: { mimeType: "application/pdf", fileBytes: 6_000_000 },
      kind: "ingest",
    });
    expect(ingest.textCredits).toBeLessThan(50);
  });

  it("does not bill localhost Ollama", () => {
    const ingest = estimateArtifactCredits({
      provider: "ollama",
      modelId: "gemma3:4b",
      sourceMode: "text",
      sourceSize: { charCount: 400 },
      kind: "ingest",
    });
    expect(ingest.textCredits).toBe(0);
  });

  it("prices OCR by page and stays under a weekly grant", () => {
    const ocr = estimateOcrCredits({
      provider: "openrouter",
      modelId: "qwen/qwen3.8-flash",
      pageCount: 10,
    });
    expect(ocr.textCredits).toBeGreaterThan(10);
    expect(ocr.textCredits).toBeLessThan(600);
  });

  it("scales output with card count", () => {
    expect(estimateOutputTokens(8)).toBe(8 * 110 + 140);
    expect(estimateOutputTokens(3)).toBe(3 * 110 + 140);
  });

  it("bills studio on the extracted slice, not a scanned PDF byte dump", () => {
    const longScan = {
      provider: "openrouter" as const,
      modelId: "qwen/qwen3.8-flash",
      sourceMode: "file" as const,
      sourceSize: {
        charCount: 80_000,
        mimeType: "application/pdf",
        scannedPdf: true,
      },
    };
    const exam = estimateArtifactCredits({ ...longScan, kind: "exam" });
    const slice = estimateArtifactCredits({
      provider: "openrouter",
      modelId: "qwen/qwen3.8-flash",
      sourceMode: "text",
      sourceSize: { charCount: 12_000 },
      kind: "exam",
    });
    expect(exam.textCredits).toBe(slice.textCredits);
    expect(exam.inputTokens).toBe(slice.inputTokens);
  });

  it("charges long notes in up to three section calls", () => {
    const base = {
      provider: "openrouter" as const,
      modelId: "deepseek/deepseek-v4-flash-0731",
      sourceMode: "file" as const,
    };
    const oneChunk = estimateArtifactCredits({
      ...base,
      sourceSize: { charCount: 4_000 },
      kind: "notes",
    });
    const long = estimateArtifactCredits({
      ...base,
      sourceSize: { charCount: 12_000 },
      kind: "notes",
    });
    expect(long.inputTokens).toBe(oneChunk.inputTokens * 3);
    expect(long.outputTokens).toBe(oneChunk.outputTokens * 3);
    expect(long.textCredits).toBeGreaterThan(oneChunk.textCredits);
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
