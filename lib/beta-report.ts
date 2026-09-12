export const BETA_REPORT_KINDS = ["comment", "bug", "error"] as const;

export type BetaReportKind = (typeof BETA_REPORT_KINDS)[number];

const IGNORE =
  /ResizeObserver loop|Loading chunk [\w.-]+ failed|AbortError|The operation was aborted/i;

export function isBetaReportKind(value: string): value is BetaReportKind {
  return (BETA_REPORT_KINDS as readonly string[]).includes(value);
}

export function normalizeBetaMessage(text: string, max = 4000) {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

export function shouldIgnoreBetaError(message: string) {
  return !message || IGNORE.test(message);
}

export function betaFingerprint(kind: string, message: string, path: string) {
  const raw = `${kind}\n${message}\n${path}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) + hash + raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
