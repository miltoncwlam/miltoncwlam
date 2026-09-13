import { describe, expect, it } from "vitest";

import {
  CREDIT_PERIOD_GRANT,
  IMAGE_PERIOD_GRANT,
  FREE_MODEL_BILLING_RATES,
  GENERATE_RATE_LIMIT_MAX,
  GUEST_GENERATE_LIMIT,
  GuestQuotaError,
  IMAGE_CREDITS_PER_USD,
  isGuestEmail,
  isGuestQuotaError,
  MIN_GENERATION_CREDITS,
  PAID_GENERATE_LIMIT_HOUR,
} from "@/lib/credits/config";
import { estimateGenerationCredits } from "@/lib/credits/estimate-generation";
import { creditsFromImageUsd, creditsFromTokens } from "@/lib/credits/token-cost";
import {
  DEFAULT_OCR_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  CHAT_OPENROUTER_MODEL,
  HK_SAFE_AUTO_MODELS,
  PAID_OPENROUTER_MODELS,
  displayOpenRouterModelName,
  isOpenRouterCatalogRouter,
  isOpenRouterFreeCatalogModel,
  isPaidOpenRouterModel,
  resolveBillingRates,
  withOpenRouterAutoRouting,
} from "@/lib/llm/models";

describe("unified token credits", () => {
  it("defaults generate to OpenRouter Auto and OCR to Qwen 3.8", () => {
    expect(DEFAULT_OPENROUTER_MODEL).toBe("openrouter/auto");
    expect(CHAT_OPENROUTER_MODEL).toBe("deepseek/deepseek-v4-flash-0731");
    expect(CHAT_OPENROUTER_MODEL).not.toMatch(/qwen|v4\.1|auto/i);
    expect(DEFAULT_OCR_MODEL).toBe("qwen/qwen3.8-flash");
    expect(PAID_OPENROUTER_MODELS.map((model) => model.id)).toEqual([
      "openrouter/auto",
      "deepseek/deepseek-v4-flash-0731",
      "qwen/qwen3.8-flash",
      "deepseek/deepseek-v4.1-flash",
    ]);
    expect(isPaidOpenRouterModel("openrouter/auto")).toBe(true);
    expect(isPaidOpenRouterModel("deepseek/deepseek-v4-flash")).toBe(true);
    expect(isPaidOpenRouterModel("qwen/qwen3.7-flash")).toBe(true);
    expect(withOpenRouterAutoRouting({ model: "openrouter/auto" })).toMatchObject({
      model: "openrouter/auto",
      plugins: [
        {
          id: "auto-router",
          cost_tier: "low",
          allowed_models: HK_SAFE_AUTO_MODELS,
        },
      ],
    });
    expect(withOpenRouterAutoRouting({ model: "qwen/qwen3.8-flash" })).toEqual({
      model: "qwen/qwen3.8-flash",
    });
  });

  it("bills Qwen 3.8 above DeepSeek 0731 and keeps the old Flash pin at the free reference", () => {
    const usage = { inputTokens: 2000, outputTokens: 1640 };
    const catalog = creditsFromTokens(usage, FREE_MODEL_BILLING_RATES);
    const qwen = creditsFromTokens(usage, resolveBillingRates({
      provider: "openrouter",
      modelId: "qwen/qwen3.8-flash",
    }));
    const deepseek = creditsFromTokens(usage, resolveBillingRates({
      provider: "openrouter",
      modelId: "deepseek/deepseek-v4-flash-0731",
    }));
    const legacyFlash = creditsFromTokens(usage, resolveBillingRates({
      provider: "openrouter",
      modelId: "deepseek/deepseek-v4-flash",
    }));

    expect(deepseek).toBeLessThan(catalog);
    expect(qwen).toBeGreaterThan(deepseek);
    expect(legacyFlash).toBe(catalog);
    expect(deepseek).toBeGreaterThanOrEqual(MIN_GENERATION_CREDITS);
    expect(
      resolveBillingRates({
        provider: "openrouter",
        modelId: "openrouter/auto",
      }),
    ).toEqual(
      resolveBillingRates({
        provider: "openrouter",
        modelId: "deepseek/deepseek-v4-flash-0731",
      }),
    );
  });

  it("cuts unpaid OpenRouter models to 60% energy until 22 Sep 23:59 UTC", () => {
    const usage = { inputTokens: 2000, outputTokens: 1640 };
    const during = Date.UTC(2026, 8, 13);
    const after = Date.UTC(2026, 8, 23, 0, 0, 0);
    const full = creditsFromTokens(usage, FREE_MODEL_BILLING_RATES);
    const sale = creditsFromTokens(
      usage,
      resolveBillingRates({
        provider: "openrouter",
        modelId: "openrouter/free",
        now: during,
      }),
    );
    expect(sale).toBe(
      creditsFromTokens(usage, {
        inputPerM: FREE_MODEL_BILLING_RATES.inputPerM * 0.6,
        outputPerM: FREE_MODEL_BILLING_RATES.outputPerM * 0.6,
      }),
    );
    expect(sale).toBeLessThan(full);
    expect(
      creditsFromTokens(
        usage,
        resolveBillingRates({
          provider: "openrouter",
          modelId: "deepseek/deepseek-v4-flash-0731",
          now: during,
        }),
      ),
    ).toBe(
      creditsFromTokens(
        usage,
        resolveBillingRates({
          provider: "openrouter",
          modelId: "deepseek/deepseek-v4-flash-0731",
          now: after,
        }),
      ),
    );
    expect(
      creditsFromTokens(
        usage,
        resolveBillingRates({
          provider: "openrouter",
          modelId: "nvidia/nemotron-3-ultra-550b-a55b:free",
          now: after,
        }),
      ),
    ).toBe(full);
    expect(isOpenRouterFreeCatalogModel("openrouter/free")).toBe(true);
    expect(isOpenRouterFreeCatalogModel("nex-agi/nex-n2.5-mini:free")).toBe(true);
    expect(isOpenRouterFreeCatalogModel("openrouter/auto")).toBe(false);
    expect(isOpenRouterCatalogRouter("openrouter/free")).toBe(true);
    expect(isOpenRouterCatalogRouter("nex-agi/nex-n2.5-mini:free")).toBe(false);
    expect(
      displayOpenRouterModelName(
        "Nex-N2.5 Mini (free)",
        "nex-agi/nex-n2.5-mini:free",
      ),
    ).toBe("Nex-N2.5 Mini");
    expect(
      displayOpenRouterModelName("Free Models Router", "openrouter/free"),
    ).not.toMatch(/free/i);
  });

  it("charges topic less than text less than file", () => {
    const base = {
      provider: "openrouter" as const,
      modelId: "qwen/qwen3.8-flash",
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
      modelId: "qwen/qwen3.8-flash",
      sourceMode: "text",
      cardCount: 8,
    });
    const withImages = estimateGenerationCredits({
      provider: "openrouter",
      modelId: "qwen/qwen3.8-flash",
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

  it("keeps Klein community-art units far below text-rate conversion", () => {
    expect(IMAGE_CREDITS_PER_USD).toBeLessThan(50_000);
    expect(creditsFromImageUsd(0.014)).toBe(7);
  });
});

describe("weekly grant and rate limits", () => {
  it("grants 600 weekly energy and no learner image pool", () => {
    expect(CREDIT_PERIOD_GRANT).toBe(600);
    expect(IMAGE_PERIOD_GRANT).toBe(0);
  });

  it("keeps a sane hourly cap", () => {
    expect(GENERATE_RATE_LIMIT_MAX).toBe(PAID_GENERATE_LIMIT_HOUR);
    expect(PAID_GENERATE_LIMIT_HOUR).toBeGreaterThanOrEqual(5);
  });

  it("caps guest generates before they need an account", () => {
    expect(GUEST_GENERATE_LIMIT).toBe(2);
    const error = new GuestQuotaError();
    expect(isGuestQuotaError(error)).toBe(true);
    expect(error.code).toBe("GUEST_QUOTA");
    expect(isGuestEmail("guest-abc@example.com")).toBe(true);
    expect(isGuestEmail("learner@example.com")).toBe(false);
  });
});
