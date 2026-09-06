import { z } from "zod";

/**
 * H4: lightweight error reporting hook.
 * Set SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN later if you add @sentry/nextjs.
 * Until then we log structured errors in production for log drains.
 */

const GENERATE_ROUTES = new Set(["notebooks", "artifacts", "generate"]);

function zodIssueSummary(error: unknown) {
  if (!(error instanceof z.ZodError)) return undefined;
  return error.issues.slice(0, 5).map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message,
  }));
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const message = error instanceof Error ? error.message : String(error);
  const payload = {
    level: "error",
    message,
    name: error instanceof Error ? error.name : undefined,
    zodIssues: zodIssueSummary(error),
    context: context ?? {},
    at: new Date().toISOString(),
  };

  const prefix =
    context?.route && GENERATE_ROUTES.has(String(context.route))
      ? "[generate]"
      : process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
        ? "[sentry]"
        : "[error]";

  if (process.env.NODE_ENV !== "test") {
    console.error(prefix, JSON.stringify(payload));
  }
}
