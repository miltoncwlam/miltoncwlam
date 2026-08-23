export const OPENROUTER_ROUTE_BUDGET_MS = 48_000;

const MAX_ATTEMPTS = 2;
const ATTEMPT_BUDGET_MS = 20_000;
const CLEANUP_RESERVE_MS = 5_000;

export class OpenRouterTimeoutError extends Error {
  constructor(message = "The AI provider took too long to respond. Please try again.") {
    super(message);
    this.name = "OpenRouterTimeoutError";
  }
}

export function isRetryableOpenRouterError(error: unknown): boolean {
  if (error instanceof OpenRouterTimeoutError) return true;
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    /abort|timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|network|fetch failed|429|408|5\d\d/i.test(
      error.message,
    )
  );
}

export async function withOpenRouterRetry<T>(
  request: (abortSignal: AbortSignal, attempt: number) => Promise<T>,
  deadlineAt = Date.now() + OPENROUTER_ROUTE_BUDGET_MS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const remaining = deadlineAt - Date.now();
    const timeout = Math.min(ATTEMPT_BUDGET_MS, remaining - CLEANUP_RESERVE_MS);
    if (timeout <= 0) {
      throw new OpenRouterTimeoutError();
    }

    try {
      return await request(AbortSignal.timeout(timeout), attempt);
    } catch (error) {
      lastError = error;
      if (!isRetryableOpenRouterError(error) || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }

      const pause = Math.min(250 * (attempt + 1), deadlineAt - Date.now() - CLEANUP_RESERVE_MS);
      if (pause > 0) {
        await new Promise((resolve) => setTimeout(resolve, pause));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new OpenRouterTimeoutError();
}
