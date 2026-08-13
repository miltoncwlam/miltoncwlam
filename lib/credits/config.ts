/** Weekly grant — keep wording as "energy" in UI; payment later. */
export const CREDIT_PERIOD_GRANT = 600;
/** Separate weekly pool for illustrations. Users do not spend this; Klein is community last-resort only. */
export const IMAGE_PERIOD_GRANT = 0;
export const CREDIT_PERIOD_DAYS = 7;

export const CREDITS_PER_USD = 50_000;
/** Image energy scale (separate from text). Klein (~$0.014) → ~7 image energy. */
export const IMAGE_CREDITS_PER_USD = 500;
export const MIN_GENERATION_CREDITS = 10;

export const GENERATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const FREE_GENERATE_LIMIT_HOUR = 5;
export const FREE_GENERATE_LIMIT_DAY = 15;
export const OLLAMA_GENERATE_LIMIT_HOUR = 10;
export const PAID_GENERATE_LIMIT_HOUR = 20;

/** @deprecated Use PAID_GENERATE_LIMIT_HOUR. Kept for older tests. */
export const GENERATE_RATE_LIMIT_MAX = PAID_GENERATE_LIMIT_HOUR;

/** DeepSeek-equivalent reference (USD per 1M tokens). OpenRouter free floor. */
export const FREE_MODEL_BILLING_RATES = {
  inputPerM: 0.08,
  outputPerM: 0.25,
} as const;

export const OLLAMA_BILLING_MULTIPLIERS = {
  "gemma4:e2b": 0.7,
  "gemma4:e4b": 0.85,
} as const;

export type BillingRates = {
  inputPerM: number;
  outputPerM: number;
};

export type SourceMode = "topic" | "text" | "url" | "file";

export type SourceSizeHints = {
  charCount?: number;
  fileBytes?: number;
  mimeType?: string;
  scannedPdf?: boolean;
};
