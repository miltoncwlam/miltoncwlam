export function reportBetaEvent(input: {
  kind: "comment" | "bug" | "error";
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}) {
  return fetch("/api/beta/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: input.kind,
      message: input.message,
      path: input.path ?? (typeof location === "undefined" ? "" : location.pathname),
      details: input.details ?? {},
    }),
    keepalive: true,
  });
}
