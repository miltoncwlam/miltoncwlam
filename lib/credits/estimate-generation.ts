import {
  INGEST_TITLE_CHARS,
  MAX_FILE_INPUT_TOKENS,
  type SourceMode,
  type SourceSizeHints,
} from "@/lib/credits/config";
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
          : Math.min(
              MAX_FILE_INPUT_TOKENS,
              Math.ceil((sourceSize.fileBytes ?? 4_000) / 4),
            );
      const base = 2_000 + fromChars;
      const scanned =
        sourceSize.scannedPdf === true ||
        (sourceSize.mimeType === "application/pdf" &&
          sourceSize.charCount != null &&
          sourceSize.charCount < 80);
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

export type ArtifactEstimateKind = "ingest" | "mindmap" | "notes" | "exam";

export function estimateArtifactOutputTokens(
  kind: ArtifactEstimateKind,
  questionCount = 12,
) {
  switch (kind) {
    case "ingest":
      return 220;
    case "mindmap":
      return 900;
    case "notes":
      return 1_400;
    case "exam":
      return Math.min(30, Math.max(6, questionCount)) * 140 + 200;
    default:
      return 800;
  }
}

export function estimateArtifactInputTokens(
  kind: ArtifactEstimateKind,
  sourceMode: SourceMode,
  sourceSize: SourceSizeHints = {},
): number {
  if (kind === "ingest") {
    const raw = sourceSize.charCount;
    const chars =
      raw != null
        ? Math.min(INGEST_TITLE_CHARS, Math.max(0, raw))
        : sourceMode === "file"
          ? INGEST_TITLE_CHARS
          : 0;
    const mode = sourceMode === "file" ? "text" : sourceMode;
    return estimateInputTokens(mode, { charCount: chars });
  }
  return estimateInputTokens(sourceMode, sourceSize);
}

export function estimateArtifactCredits(input: {
  provider: "openrouter";
  modelId: string;
  sourceMode: SourceMode;
  sourceSize?: SourceSizeHints;
  kind: ArtifactEstimateKind;
  questionCount?: number;
}): GenerationEstimate {
  const inputTokens = estimateArtifactInputTokens(
    input.kind,
    input.sourceMode,
    input.sourceSize ?? {},
  );
  const outputTokens = estimateArtifactOutputTokens(
    input.kind,
    input.questionCount,
  );
  const rates = resolveBillingRates({
    provider: input.provider,
    modelId: input.modelId,
  });
  const textCredits = creditsFromTokens({ inputTokens, outputTokens }, rates);
  return {
    credits: textCredits,
    textCredits,
    imageCredits: 0,
    inputTokens,
    outputTokens,
    breakdown: `~${textCredits} energy`,
  };
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
  const breakdown = `~${textCredits} energy`;

  return {
    credits,
    textCredits,
    imageCredits,
    inputTokens,
    outputTokens,
    breakdown,
  };
}
