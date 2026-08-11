/**
 * H4: lightweight error reporting hook.
 * Set SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN later if you add @sentry/nextjs.
 * Until then we log structured errors in production for log drains.
 */

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = {
    level: "error",
    message,
    context: context ?? {},
    at: new Date().toISOString(),
  };

  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error("[sentry]", JSON.stringify(payload), error);
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    console.error("[error]", payload);
  }
}
