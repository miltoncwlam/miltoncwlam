import type { AppLocale } from "@/lib/i18n/locales";

export type IngestProgress = {
  language: AppLocale;
  needsOcr?: boolean;
  ocrNext?: number;
  ocrTotal?: number;
  ocrBusy?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  spentTextAmount?: number;
  preferredTitle?: string;
};

export function parseIngestProgress(value: unknown): IngestProgress | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const language = typeof row.language === "string" ? row.language : "en";
  return {
    language: language as AppLocale,
    needsOcr: Boolean(row.needsOcr),
    ocrNext: Number(row.ocrNext) || undefined,
    ocrTotal: Number(row.ocrTotal) || undefined,
    ocrBusy: Boolean(row.ocrBusy),
    inputTokens: Number(row.inputTokens) || 0,
    outputTokens: Number(row.outputTokens) || 0,
    spentTextAmount: Number(row.spentTextAmount) || 0,
    preferredTitle:
      typeof row.preferredTitle === "string" ? row.preferredTitle : undefined,
  };
}

export function ingestPhaseLabel(progress: IngestProgress | null): string {
  if (!progress?.needsOcr) return "title";
  const next = progress.ocrNext ?? 1;
  const total = progress.ocrTotal ?? 0;
  if (total && next <= total) return `ocr:${next}/${total}`;
  return "title";
}
