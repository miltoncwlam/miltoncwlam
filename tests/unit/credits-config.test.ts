import { describe, expect, it } from "vitest";

import {
  CREDIT_PERIOD_GRANT,
  IMAGE_PERIOD_GRANT,
  FREE_MODEL_BILLING_RATES,
  GENERATE_RATE_LIMIT_MAX,
  IMAGE_CREDITS_PER_USD,
  MIN_GENERATION_CREDITS,
  OLLAMA_BILLING_MULTIPLIERS,
  PAID_GENERATE_LIMIT_HOUR,
} from "@/lib/credits/config";
import { estimateGenerationCredits } from "@/lib/credits/estimate-generation";
import { creditsFromImageUsd, creditsFromTokens } from "@/lib/credits/token-cost";
import { resolveBillingRates } from "@/lib/llm/models";

describe("unified token credits", () => {
  it("keeps e4b cheaper than the OpenRouter catalog energy floor", () => {
    const usage = { inputTokens: 2000, outputTokens: 1640 };
    const e2b = creditsFromTokens(usage, resolveBillingRates({
      provider: "ollama",
      modelId: "gemma4:e2b",
    }));
    const e4b = creditsFromTokens(usage, resolveBillingRates({
      provider: "ollama",
      modelId: "gemma4:e4b",
    }));
    const catalog = creditsFromTokens(usage, FREE_MODEL_BILLING_RATES);
    const qwen = creditsFromTokens(usage, resolveBillingRates({
      provider: "openrouter",
      modelId: "qwen/qwen3.7-flash",
    }));
    const deepseek = creditsFromTokens(usage, resolveBillingRates({
      provider: "openrouter",
      modelId: "deepseek/deepseek-v4-flash",
    }));

    expect(e2b).toBeLessThanOrEqual(e4b);
    expect(e4b).toBeLessThan(catalog);
    expect(qwen).toBeLessThan(deepseek);
    expect(deepseek).toBe(catalog);
    expect(e2b).toBeGreaterThanOrEqual(MIN_GENERATION_CREDITS);
  });

  it("uses 0.70 / 0.85 Ollama multipliers vs free reference", () => {
    expect(OLLAMA_BILLING_MULTIPLIERS["gemma4:e2b"]).toBe(0.7);
    expect(OLLAMA_BILLING_MULTIPLIERS["gemma4:e4b"]).toBe(0.85);
    expect(OLLAMA_BILLING_MULTIPLIERS["gemma4:e4b"]).toBeLessThanOrEqual(1);
  });

  it("charges topic less than text less than file", () => {
    const base = {
      provider: "openrouter" as const,
      modelId: "qwen/qwen3.7-flash",
      cardCount: 8,
    };
    const topic = estimateGenerationCredits({ ...base, sourceMode: "topic" });
    const text = estimateGenerationCredits({
      ...base,
      sourceMode: "text",
      sourceSize: { charCount: 2500 },
    });
    const file = estimateGenerationCredits({
      ...base,
      sourceMode: "file",
      sourceSize: { mimeType: "application/pdf", scannedPdf: true },
    });
    expect(topic.credits).toBeLessThan(text.credits);
    expect(text.credits).toBeLessThan(file.credits);
  });

  it("adds image credits when illustrations are on", () => {
    const textOnly = estimateGenerationCredits({
      provider: "openrouter",
      modelId: "qwen/qwen3.7-flash",
      sourceMode: "text",
      cardCount: 8,
    });
    const withImages = estimateGenerationCredits({
      provider: "openrouter",
      modelId: "qwen/qwen3.7-flash",
      sourceMode: "text",
      cardCount: 8,
      illustrations: true,
      usdPerImage: 0.014,
    });
    expect(withImages.credits).toBeGreaterThan(textOnly.credits);
    expect(withImages.imageCredits).toBe(creditsFromImageUsd(8 * 0.014));
    expect(IMAGE_PERIOD_GRANT).toBe(0);
    expect(withImages.textCredits).toBe(textOnly.textCredits);
  });

  it("keeps Klein image energy far below text-rate conversion", () => {
    expect(IMAGE_CREDITS_PER_USD).toBeLessThan(50_000);
    expect(creditsFromImageUsd(0.014)).toBe(7);
  });
});

describe("weekly grant and rate limits", () => {
  it("grants 600 text energy and no user image energy", () => {
    expect(CREDIT_PERIOD_GRANT).toBe(600);
    expect(IMAGE_PERIOD_GRANT).toBe(0);
  });

  it("keeps a sane hourly cap", () => {
    expect(GENERATE_RATE_LIMIT_MAX).toBe(PAID_GENERATE_LIMIT_HOUR);
    expect(PAID_GENERATE_LIMIT_HOUR).toBeGreaterThanOrEqual(5);
    expect(PAID_GENERATE_LIMIT_HOUR).toBeLessThanOrEqual(100);
  });
});
