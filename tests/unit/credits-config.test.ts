import { describe, expect, it } from "vitest";

import {
  CREDIT_COST_PER_CARD,
  GENERATE_RATE_LIMIT_MAX,
  creditCostForGeneration,
} from "@/lib/credits/config";

describe("creditCostForGeneration", () => {
  it("charges e2b cheaper than e4b", () => {
    expect(
      creditCostForGeneration({
        provider: "ollama",
        model: "gemma4:e2b",
        cardCount: 10,
      }),
    ).toBe(10 * CREDIT_COST_PER_CARD["gemma4:e2b"]);
    expect(
      creditCostForGeneration({
        provider: "ollama",
        model: "gemma4:e4b",
        cardCount: 10,
      }),
    ).toBe(10 * CREDIT_COST_PER_CARD["gemma4:e4b"]);
  });
});

describe("generate rate limit config", () => {
  it("keeps a sane hourly cap", () => {
    expect(GENERATE_RATE_LIMIT_MAX).toBeGreaterThanOrEqual(5);
    expect(GENERATE_RATE_LIMIT_MAX).toBeLessThanOrEqual(100);
  });
});
