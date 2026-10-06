import { z } from "zod";

function errorBlob(error: unknown, depth = 0): string {
  if (depth > 5 || error == null) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause = error.cause == null ? "" : errorBlob(error.cause, depth + 1);
    return `${error.name} ${error.message} ${cause}`;
  }
  return String(error);
}

export function isGenerateTimeout(error: unknown) {
  return /timeout|aborted|timed out|TimeoutError|AbortError/i.test(errorBlob(error));
}

/** Sentences we can turn into notes, a map, an exam, or cards when the model does not finish. */
export function studyPoints(source: string, limit = 8): string[] {
  const seen = new Set<string>();
  const points: string[] = [];
  for (const part of source.replace(/\r\n/g, "\n").split(/\n+|(?<=[.!?。！？])\s+/)) {
    const line = part
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (line.length < 12 || line.length > 240) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(/[.!?。！？]$/.test(line) ? line : `${line}.`);
    if (points.length >= limit) break;
  }
  return points;
}

/** Cut a source that already ran long, so the next call can finish. */
export function shorterStudySource(source: string) {
  const text = source.trim();
  if (text.length <= 2_500) return text;
  const cap = Math.min(3_500, Math.floor(text.length * 0.5));
  return text.slice(0, Math.max(1_200, cap));
}

/** Schema/JSON failures are usually fast. Timeouts get a shorter source instead of the same prompt again. */
export function isRetryableGenerateError(error: unknown): boolean {
  if (error instanceof z.ZodError) return true;
  if (isGenerateTimeout(error)) return false;
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /JSONParseError|Invalid JSON response|invalid json|NoObjectGenerated|TypeValidationError|did not match schema|invalid_type|too_small|invalid option|NoContentGenerated|could not parse|leaked instructions|not study-ready/i.test(
    text,
  );
}

export async function generateObjectWithRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isRetryableGenerateError(error)) throw error;
    return await run();
  }
}
