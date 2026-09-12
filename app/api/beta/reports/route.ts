import { cookies, headers } from "next/headers";

import { getSession } from "@/lib/auth-server";
import {
  BETA_COOKIE,
  hasV4BetaAccess,
} from "@/lib/beta";
import { isBetaReportKind, shouldIgnoreBetaError } from "@/lib/beta-report";
import { hashBetaIp, insertBetaReport } from "@/lib/data/beta-reports";

function clientIp(headerList: Headers) {
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "0.0.0.0"
  );
}

export async function POST(request: Request) {
  const beta = hasV4BetaAccess((await cookies()).get(BETA_COOKIE)?.value);
  if (!beta) {
    return Response.json({ error: "Beta only" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const kind = typeof payload.kind === "string" ? payload.kind : "";
  if (!isBetaReportKind(kind)) {
    return Response.json({ error: "Unknown kind" }, { status: 400 });
  }

  const message = typeof payload.message === "string" ? payload.message : "";
  if (kind === "error" && shouldIgnoreBetaError(message)) {
    return Response.json({ ok: true, ignored: true });
  }
  if ((kind === "comment" || kind === "bug") && message.trim().length < 8) {
    return Response.json({ error: "Write a bit more." }, { status: 400 });
  }

  const path = typeof payload.path === "string" ? payload.path : "";
  const details =
    payload.details && typeof payload.details === "object"
      ? (payload.details as Record<string, unknown>)
      : {};

  const headerList = await headers();
  const session = await getSession();
  const result = await insertBetaReport({
    kind,
    message,
    path,
    userId: session?.user.id ?? null,
    userAgent: headerList.get("user-agent"),
    ipHash: hashBetaIp(clientIp(headerList)),
    details,
  });

  if (!result.ok && result.reason === "empty") {
    return Response.json({ error: "Empty" }, { status: 400 });
  }
  if (!result.ok && result.reason === "rate") {
    return Response.json({ error: "Too many reports" }, { status: 429 });
  }
  return Response.json({ ok: true, duplicate: result.duplicate === true });
}
