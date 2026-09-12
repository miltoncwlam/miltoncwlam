import "server-only";

import { createHash } from "node:crypto";

import { pool } from "@/lib/db";
import {
  type BetaReportKind,
  betaFingerprint,
  normalizeBetaMessage,
} from "@/lib/beta-report";

export type BetaReportRow = {
  id: string;
  created_at: Date;
  kind: BetaReportKind;
  message: string;
  path: string | null;
  user_id: string | null;
  fingerprint: string | null;
  user_agent: string | null;
  details: unknown;
};

export function hashBetaIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function insertBetaReport(input: {
  kind: BetaReportKind;
  message: string;
  path?: string;
  userId?: string | null;
  userAgent?: string | null;
  ipHash?: string | null;
  details?: Record<string, unknown>;
}) {
  const message = normalizeBetaMessage(input.message);
  if (message.length < 2) return { ok: false as const, reason: "empty" };
  const path = (input.path ?? "").slice(0, 300);
  const fingerprint = betaFingerprint(input.kind, message, path);

  const dup = await pool.query<{ exists: boolean }>(
    `select exists(
       select 1 from beta_reports
       where fingerprint = $1 and created_at > now() - interval '10 minutes'
     ) as exists`,
    [fingerprint],
  );
  if (dup.rows[0]?.exists) return { ok: true as const, duplicate: true };

  if (input.ipHash) {
    const hour = await pool.query<{ n: string }>(
      `select count(*)::text as n from beta_reports
       where ip_hash = $1 and created_at > now() - interval '1 hour'`,
      [input.ipHash],
    );
    const limit = input.kind === "error" ? 30 : 12;
    if (Number(hour.rows[0]?.n ?? 0) >= limit) {
      return { ok: false as const, reason: "rate" };
    }
  }

  await pool.query(
    `insert into beta_reports
       (kind, message, path, user_id, fingerprint, user_agent, ip_hash, details)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      input.kind,
      message,
      path || null,
      input.userId ?? null,
      fingerprint,
      input.userAgent?.slice(0, 300) ?? null,
      input.ipHash ?? null,
      JSON.stringify(input.details ?? {}),
    ],
  );
  return { ok: true as const, duplicate: false };
}

export async function listBetaReports(limit = 100) {
  const result = await pool.query<BetaReportRow>(
    `select id, created_at, kind, message, path, user_id, fingerprint, user_agent, details
     from beta_reports
     order by created_at desc
     limit $1`,
    [limit],
  );
  return result.rows;
}
