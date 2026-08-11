import "server-only";

import { pool } from "@/lib/db";

export async function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await pool.query(
    `insert into audit_log (user_id, action, entity_type, entity_id, meta)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.userId ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.meta ?? {}),
    ],
  );
}

export async function listAuditLog(limit = 100) {
  const result = await pool.query<{
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    meta: unknown;
    created_at: Date;
    email: string | null;
  }>(
    `select a.*, u.email
     from audit_log a
     left join "user" u on u.id = a.user_id
     order by a.created_at desc
     limit $1`,
    [limit],
  );
  return result.rows;
}
