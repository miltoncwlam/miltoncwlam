import {
  INGEST_TITLE_CHARS,
  MAX_FILE_INPUT_TOKENS,
  MAX_OCR_PAGES,
  OCR_INPUT_TOKENS_PER_PAGE,
  OCR_OUTPUT_TOKENS_PER_PAGE,
  type SourceMode,
  type SourceSizeHints,
} from "@/lib/credits/config";
import { creditsFromImageUsd, creditsFromTokens } from "@/lib/credits/token-cost";
import {
  STUDIO_SECTION_CAP,
  studioChunkChars,
  type StudioDepth,
} from "@/lib/i18n/locales";
import { resolveBillingRates } from "@/lib/llm/models";
import type { LLMProvider } from "@/lib/types/flashcard";

export type EstimateGenerationInput = {
  provider: LLMProvider;
  modelId: string;
  sourceMode: SourceMode;
  sourceSize?: SourceSizeHints;
  cardCount: number;
  depth?: StudioDepth;
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
  return count * 110 + 140;
}

export type ArtifactEstimateKind = "ingest" | "mindmap" | "notes" | "exam";

function studioBilledSource(
  kind: ArtifactEstimateKind | "cards",
  sourceMode: SourceMode,
  sourceSize: SourceSizeHints,
  depth: StudioDepth = "basic",
): { mode: SourceMode; chars: number; calls: number } {
  const chunk = studioChunkChars(depth);
  const raw = Math.max(0, sourceSize.charCount ?? 0);
  const mode = sourceMode === "topic" ? "topic" : "text";
  const calls =
    kind === "notes" || kind === "mindmap"
      ? Math.min(
          STUDIO_SECTION_CAP,
          Math.max(1, raw > chunk ? Math.ceil(raw / chunk) : 1),
        )
      : 1;
  return { mode, chars: Math.min(raw, chunk), calls };
}

export function estimateArtifactOutputTokens(
  kind: ArtifactEstimateKind,
  questionCount = 12,
  calls = 1,
) {
  const perCall = (() => {
    switch (kind) {
      case "ingest":
        return 220;
      case "mindmap":
        return 450;
      case "notes":
        return 650;
      case "exam":
        return Math.min(30, Math.max(6, questionCount)) * 70 + 120;
      default:
        return 500;
    }
  })();
  return perCall * Math.max(1, calls);
}

export function estimateArtifactInputTokens(
  kind: ArtifactEstimateKind,
  sourceMode: SourceMode,
  sourceSize: SourceSizeHints = {},
  depth: StudioDepth = "basic",
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
  const billed = studioBilledSource(kind, sourceMode, sourceSize, depth);
  return (
    billed.calls *
    estimateInputTokens(billed.mode, { charCount: billed.chars })
  );
}

export function estimateArtifactCredits(input: {
  provider: LLMProvider;
  modelId: string;
  sourceMode: SourceMode;
  sourceSize?: SourceSizeHints;
  kind: ArtifactEstimateKind;
  questionCount?: number;
  depth?: StudioDepth;
}): GenerationEstimate {
  if (input.provider === "ollama") {
    return {
      credits: 0,
      textCredits: 0,
      imageCredits: 0,
      inputTokens: 0,
      outputTokens: 0,
      breakdown: "~0 energy",
    };
  }
  const depth = input.depth ?? "basic";
  const billed = studioBilledSource(
    input.kind,
    input.sourceMode,
    input.sourceSize ?? {},
    depth,
  );
  const inputTokens = estimateArtifactInputTokens(
    input.kind,
    input.sourceMode,
    input.sourceSize ?? {},
    depth,
  );
  const outputTokens = estimateArtifactOutputTokens(
    input.kind,
    input.questionCount,
    input.kind === "ingest" ? 1 : billed.calls,
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

export function estimateOcrCredits(input: {
  provider: LLMProvider;
  modelId: string;
  pageCount: number;
}): GenerationEstimate {
  const pages = Math.min(MAX_OCR_PAGES, Math.max(1, Math.floor(input.pageCount)));
  const inputTokens = pages * OCR_INPUT_TOKENS_PER_PAGE + 300;
  const outputTokens = pages * OCR_OUTPUT_TOKENS_PER_PAGE;
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
  if (input.provider === "ollama") {
    return {
      credits: 0,
      textCredits: 0,
      imageCredits: 0,
      inputTokens: 0,
      outputTokens: 0,
      breakdown: "~0 energy",
    };
  }
  const cardCount = Math.min(30, Math.max(3, input.cardCount));
  const billed = studioBilledSource(
    "cards",
    input.sourceMode,
    input.sourceSize ?? {},
    input.depth ?? "basic",
  );
  const inputTokens = estimateInputTokens(billed.mode, {
    charCount: billed.chars,
  });
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
