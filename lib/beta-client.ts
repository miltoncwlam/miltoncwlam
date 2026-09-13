import { BETA_SESSION_KEY } from "@/lib/beta";

function betaSessionHeader(): Record<string, string> {
  try {
    if (sessionStorage.getItem(BETA_SESSION_KEY) === "1") {
      return { "x-hkstudya-beta": "1" };
    }
  } catch {
    // ignore
  }
  return {};
}

export function reportBetaEvent(input: {
  kind: "comment" | "bug" | "error";
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}) {
  return fetch("/api/beta/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...betaSessionHeader(),
    },
    body: JSON.stringify({
      kind: input.kind,
      message: input.message,
      path: input.path ?? (typeof location === "undefined" ? "" : location.pathname),
      details: input.details ?? {},
    }),
    keepalive: true,
  });
}
