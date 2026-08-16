/** Weekly grant — keep wording as "energy" in UI; payment later. */
export const CREDIT_PERIOD_GRANT = 600;
/** Unused weekly image pool (always 0 for learners). Community Klein art is last-resort only. */
export const IMAGE_PERIOD_GRANT = 0;
export const CREDIT_PERIOD_DAYS = 7;

export const CREDITS_PER_USD = 50_000;
/** Internal USD→units for community Klein art. Not a learner currency. */
export const IMAGE_CREDITS_PER_USD = 500;
export const MIN_GENERATION_CREDITS = 10;

export const GENERATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const FREE_GENERATE_LIMIT_HOUR = 5;
export const FREE_GENERATE_LIMIT_DAY = 15;
export const PAID_GENERATE_LIMIT_HOUR = 20;

/** @deprecated Use PAID_GENERATE_LIMIT_HOUR. Kept for older tests. */
export const GENERATE_RATE_LIMIT_MAX = PAID_GENERATE_LIMIT_HOUR;

/** DeepSeek-equivalent reference (USD per 1M tokens). OpenRouter free floor. */
export const FREE_MODEL_BILLING_RATES = {
  inputPerM: 0.08,
  outputPerM: 0.25,
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
