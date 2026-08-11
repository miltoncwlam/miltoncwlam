import type { OllamaModelId } from "@/lib/types/flashcard";

/** Weekly grant — keep wording as "energy" in UI; payment later. */
export const CREDIT_PERIOD_GRANT = 100;
export const CREDIT_PERIOD_DAYS = 7;

/** F6: soft abuse guard on generate API (per user). */
export const GENERATE_RATE_LIMIT_MAX = 20;
export const GENERATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Credits charged per generated card/question. */
export const CREDIT_COST_PER_CARD: Record<OllamaModelId | "cloud", number> = {
  "gemma4:e2b": 1,
  "gemma4:e4b": 2,
  cloud: 2,
};

export function creditCostForGeneration(input: {
  provider: string;
  model?: string | null;
  cardCount: number;
}): number {
  const count = Math.min(30, Math.max(3, input.cardCount));
  const per =
    input.provider === "ollama" && input.model === "gemma4:e2b"
      ? CREDIT_COST_PER_CARD["gemma4:e2b"]
      : input.provider === "ollama"
        ? CREDIT_COST_PER_CARD["gemma4:e4b"]
        : CREDIT_COST_PER_CARD.cloud;
  return count * per;
}
