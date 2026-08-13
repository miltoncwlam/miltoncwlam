import { type SourceMode, type SourceSizeHints } from "@/lib/credits/config";
import { creditsFromImageUsd, creditsFromTokens } from "@/lib/credits/token-cost";
import { resolveBillingRates } from "@/lib/llm/models";

export type EstimateGenerationInput = {
  provider: "openrouter";
  modelId: string;
  sourceMode: SourceMode;
  sourceSize?: SourceSizeHints;
  cardCount: number;
  illustrations?: boolean;
  imageCount?: number;
  usdPerImage?: number;
};

export type GenerationEstimate = {
  credits: number;
  textCredits: number;
  imageCredits: number;
  inputTokens: number;
  outputTokens: number;
  breakdown: string;
};

export function estimateInputTokens(
  sourceMode: SourceMode,
  sourceSize: SourceSizeHints = {},
): number {
  const chars = Math.max(0, sourceSize.charCount ?? 0);

  switch (sourceMode) {
    case "topic":
      return 500 + Math.min(200, Math.ceil(chars * 0.25));
    case "text":
      return 800 + Math.ceil(chars * 0.25);
    case "url":
      return 1_200 + Math.ceil(chars * 0.25);
    case "file": {
      const fromChars =
        chars > 0
          ? Math.ceil(chars * 0.3)
          : Math.ceil((sourceSize.fileBytes ?? 4_000) / 4);
      const base = 2_000 + fromChars;
      const scanned =
        sourceSize.scannedPdf ||
        (sourceSize.mimeType === "application/pdf" && chars < 80);
      return scanned ? Math.ceil(base * 3) : base;
    }
    default:
      return 800;
  }
}

export function estimateOutputTokens(cardCount: number): number {
  const count = Math.min(30, Math.max(3, cardCount));
  return count * 180 + 200;
}

export function estimateGenerationCredits(
  input: EstimateGenerationInput,
): GenerationEstimate {
  const cardCount = Math.min(30, Math.max(3, input.cardCount));
  const inputTokens = estimateInputTokens(
    input.sourceMode,
    input.sourceSize ?? {},
  );
  const outputTokens = estimateOutputTokens(cardCount);
  const rates = resolveBillingRates({
    provider: input.provider,
    modelId: input.modelId,
  });
  const textCredits = creditsFromTokens(
    { inputTokens, outputTokens },
    rates,
  );

  const imageCount = input.illustrations
    ? Math.min(cardCount, Math.max(0, input.imageCount ?? cardCount))
    : 0;
  const usdPerImage = input.usdPerImage ?? 0.014;
  const imageCredits =
    imageCount > 0 ? creditsFromImageUsd(imageCount * usdPerImage) : 0;

  const credits = textCredits + imageCredits;
  const breakdown = imageCredits
    ? `~${textCredits} text energy · ~${imageCredits} image energy`
    : `~${textCredits} text energy`;

  return {
    credits,
    textCredits,
    imageCredits,
    inputTokens,
    outputTokens,
    breakdown,
  };
}
