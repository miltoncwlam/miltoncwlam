import {
  CREDITS_PER_USD,
  IMAGE_CREDITS_PER_USD,
  MIN_GENERATION_CREDITS,
  type BillingRates,
} from "@/lib/credits/config";

export function creditsFromTokens(
  usage: { inputTokens: number; outputTokens: number },
  rates: BillingRates,
): number {
  const usd =
    (Math.max(0, usage.inputTokens) / 1e6) * rates.inputPerM +
    (Math.max(0, usage.outputTokens) / 1e6) * rates.outputPerM;
  return Math.max(MIN_GENERATION_CREDITS, Math.ceil(usd * CREDITS_PER_USD));
}

export function creditsFromUsd(usd: number): number {
  return Math.max(MIN_GENERATION_CREDITS, Math.ceil(Math.max(0, usd) * CREDITS_PER_USD));
}

export function creditsFromImageUsd(usd: number): number {
  return Math.max(1, Math.ceil(Math.max(0, usd) * IMAGE_CREDITS_PER_USD));
}

/** Internal only — USD for ledger/meta; never shown in UI. */
export function usdFromCredits(credits: number): number {
  return credits / CREDITS_PER_USD;
}

export function usdFromTokens(
  usage: { inputTokens: number; outputTokens: number },
  rates: BillingRates,
): number {
  return (
    (Math.max(0, usage.inputTokens) / 1e6) * rates.inputPerM +
    (Math.max(0, usage.outputTokens) / 1e6) * rates.outputPerM
  );
}
