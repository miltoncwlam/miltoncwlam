import { z } from "zod";

/** Schema/JSON failures are usually fast; skip retry on timeouts so we stay under Vercel’s 60s cap. */
export function isRetryableGenerateError(error: unknown): boolean {
  if (error instanceof z.ZodError) return true;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|aborted|timed out|TimeoutError|AbortError/i.test(`${name} ${message}`)) {
    return false;
  }
  return /JSONParseError|NoObjectGenerated|TypeValidationError|did not match schema|invalid_type|too_small|invalid option|NoContentGenerated|could not parse/i.test(
    `${name} ${message}`,
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
