import "server-only";

import { pool } from "@/lib/db";
import {
  CREDIT_PERIOD_DAYS,
  CREDIT_PERIOD_GRANT,
  GENERATE_RATE_LIMIT_MAX,
  GENERATE_RATE_LIMIT_WINDOW_MS,
} from "@/lib/credits/config";

export type UserCreditBalance = {
  userId: string;
  balance: number;
  periodStart: Date;
  periodEnd: Date;
  periodGrant: number;
  isUnlimited: boolean;
};

function mapRow(row: {
  user_id: string;
  balance: number;
  period_start: Date;
  period_end: Date;
  period_grant: number;
  is_unlimited?: boolean;
}): UserCreditBalance {
  return {
    userId: row.user_id,
    balance: row.balance,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    periodGrant: row.period_grant,
    isUnlimited: Boolean(row.is_unlimited),
  };
}

async function ensureRow(userId: string): Promise<UserCreditBalance> {
  const inserted = await pool.query<{
    user_id: string;
    balance: number;
    period_start: Date;
    period_end: Date;
    period_grant: number;
    is_unlimited: boolean;
  }>(
    `insert into user_credits (user_id, balance, period_start, period_end, period_grant)
     values ($1, $2, date_trunc('week', now()), date_trunc('week', now()) + ($3::text || ' days')::interval, $2)
     on conflict (user_id) do nothing
     returning *`,
    [userId, CREDIT_PERIOD_GRANT, String(CREDIT_PERIOD_DAYS)],
  );
  if (inserted.rows[0]) return mapRow(inserted.rows[0]);

  const existing = await pool.query<{
    user_id: string;
    balance: number;
    period_start: Date;
    period_end: Date;
    period_grant: number;
    is_unlimited: boolean;
  }>("select * from user_credits where user_id = $1", [userId]);
  return mapRow(existing.rows[0]);
}

/** Refill balance when the weekly cycle ends. */
export async function getOrRefreshCredits(
  userId: string,
): Promise<UserCreditBalance> {
  const current = await ensureRow(userId);
  if (current.isUnlimited || current.periodEnd.getTime() > Date.now()) {
    return current;
  }

  const refreshed = await pool.query<{
    user_id: string;
    balance: number;
    period_start: Date;
    period_end: Date;
    period_grant: number;
    is_unlimited: boolean;
  }>(
    `update user_credits
     set balance = period_grant,
         period_start = date_trunc('week', now()),
         period_end = date_trunc('week', now()) + ($2::text || ' days')::interval,
         updated_at = now()
     where user_id = $1
     returning *`,
    [userId, String(CREDIT_PERIOD_DAYS)],
  );

  await pool.query(
    `insert into credit_ledger (user_id, delta, reason, meta)
     values ($1, $2, 'period_refill', $3::jsonb)`,
    [
      userId,
      refreshed.rows[0].period_grant,
      JSON.stringify({ periodDays: CREDIT_PERIOD_DAYS }),
    ],
  );

  return mapRow(refreshed.rows[0]);
}

export async function assertAndSpendCredits(input: {
  userId: string;
  amount: number;
  reason: string;
  meta?: Record<string, unknown>;
}): Promise<UserCreditBalance> {
  if (input.amount <= 0) {
    return getOrRefreshCredits(input.userId);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into user_credits (user_id, balance, period_start, period_end, period_grant)
       values ($1, $2, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days', $2)
       on conflict (user_id) do nothing`,
      [input.userId, CREDIT_PERIOD_GRANT],
    );

    const locked = await client.query<{
      user_id: string;
      balance: number;
      period_start: Date;
      period_end: Date;
      period_grant: number;
      is_unlimited: boolean;
    }>("select * from user_credits where user_id = $1 for update", [
      input.userId,
    ]);
    let row = locked.rows[0];

    if (row.is_unlimited) {
      await client.query(
        `insert into credit_ledger (user_id, delta, reason, meta)
         values ($1, 0, $2, $3::jsonb)`,
        [
          input.userId,
          input.reason,
          JSON.stringify({ ...(input.meta ?? {}), unlimited: true }),
        ],
      );
      await client.query("commit");
      return mapRow(row);
    }

    if (row.period_end.getTime() <= Date.now()) {
      const refill = await client.query<{
        user_id: string;
        balance: number;
        period_start: Date;
        period_end: Date;
        period_grant: number;
        is_unlimited: boolean;
      }>(
        `update user_credits
         set balance = period_grant,
             period_start = date_trunc('week', now()),
             period_end = date_trunc('week', now()) + interval '7 days',
             updated_at = now()
         where user_id = $1
         returning *`,
        [input.userId],
      );
      row = refill.rows[0];
      await client.query(
        `insert into credit_ledger (user_id, delta, reason, meta)
         values ($1, $2, 'period_refill', '{}'::jsonb)`,
        [input.userId, row.period_grant],
      );
    }

    if (row.balance < input.amount) {
      throw new Error(
        `Not enough energy. Need ${input.amount}, have ${row.balance}. Energy refills each week.`,
      );
    }

    const spent = await client.query<{
      user_id: string;
      balance: number;
      period_start: Date;
      period_end: Date;
      period_grant: number;
      is_unlimited: boolean;
    }>(
      `update user_credits
       set balance = balance - $2, updated_at = now()
       where user_id = $1
       returning *`,
      [input.userId, input.amount],
    );

    await client.query(
      `insert into credit_ledger (user_id, delta, reason, meta)
       values ($1, $2, $3, $4::jsonb)`,
      [
        input.userId,
        -input.amount,
        input.reason,
        JSON.stringify(input.meta ?? {}),
      ],
    );

    await client.query("commit");
    return mapRow(spent.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** B11: restore energy after a failed generate that already spent. */
export async function refundCredits(input: {
  userId: string;
  amount: number;
  reason?: string;
  meta?: Record<string, unknown>;
}): Promise<UserCreditBalance | null> {
  if (input.amount <= 0) return null;

  const client = await pool.connect();
  try {
    await client.query("begin");
    const locked = await client.query<{
      user_id: string;
      balance: number;
      period_start: Date;
      period_end: Date;
      period_grant: number;
      is_unlimited: boolean;
    }>("select * from user_credits where user_id = $1 for update", [
      input.userId,
    ]);
    const row = locked.rows[0];
    if (!row) {
      await client.query("rollback");
      return null;
    }

    if (row.is_unlimited) {
      await client.query(
        `insert into credit_ledger (user_id, delta, reason, meta)
         values ($1, 0, $2, $3::jsonb)`,
        [
          input.userId,
          input.reason ?? "generate_refund",
          JSON.stringify({ ...(input.meta ?? {}), unlimited: true }),
        ],
      );
      await client.query("commit");
      return mapRow(row);
    }

    const refunded = await client.query<{
      user_id: string;
      balance: number;
      period_start: Date;
      period_end: Date;
      period_grant: number;
      is_unlimited: boolean;
    }>(
      `update user_credits
       set balance = balance + $2, updated_at = now()
       where user_id = $1
       returning *`,
      [input.userId, input.amount],
    );

    await client.query(
      `insert into credit_ledger (user_id, delta, reason, meta)
       values ($1, $2, $3, $4::jsonb)`,
      [
        input.userId,
        input.amount,
        input.reason ?? "generate_refund",
        JSON.stringify(input.meta ?? {}),
      ],
    );

    await client.query("commit");
    return mapRow(refunded.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** F6: reject burst generate abuse (counts spend ledger rows in window). */
export async function assertGenerateRateLimit(userId: string): Promise<void> {
  const result = await pool.query<{ count: string }>(
    `select count(*)::text as count
     from credit_ledger
     where user_id = $1
       and reason in ('generate_deck', 'generate_quiz')
       and created_at > now() - ($2::text || ' milliseconds')::interval`,
    [userId, String(GENERATE_RATE_LIMIT_WINDOW_MS)],
  );
  const count = Number(result.rows[0]?.count ?? 0);
  if (count >= GENERATE_RATE_LIMIT_MAX) {
    throw new Error(
      `Too many generates this hour (max ${GENERATE_RATE_LIMIT_MAX}). Try again later.`,
    );
  }
}

export async function setUserEnergySettings(input: {
  userId: string;
  periodGrant: number;
  isUnlimited: boolean;
  balance?: number;
}): Promise<UserCreditBalance> {
  const grant = Math.max(0, Math.floor(input.periodGrant));
  const result = await pool.query<{
    user_id: string;
    balance: number;
    period_start: Date;
    period_end: Date;
    period_grant: number;
    is_unlimited: boolean;
  }>(
    `insert into user_credits (
       user_id, balance, period_start, period_end, period_grant, is_unlimited
     ) values (
       $1,
       coalesce($4, $2),
       date_trunc('week', now()),
       date_trunc('week', now()) + interval '7 days',
       $2,
       $3
     )
     on conflict (user_id) do update
     set period_grant = excluded.period_grant,
         is_unlimited = excluded.is_unlimited,
         balance = coalesce($4, user_credits.balance),
         updated_at = now()
     returning *`,
    [input.userId, grant, input.isUnlimited, input.balance ?? null],
  );

  await pool.query(
    `insert into credit_ledger (user_id, delta, reason, meta)
     values ($1, 0, 'admin_adjust', $2::jsonb)`,
    [
      input.userId,
      JSON.stringify({
        periodGrant: grant,
        isUnlimited: input.isUnlimited,
        balance: input.balance ?? null,
      }),
    ],
  );

  return mapRow(result.rows[0]);
}

export async function listCreditLedger(limit = 100) {
  const result = await pool.query<{
    id: string;
    user_id: string;
    delta: number;
    reason: string;
    meta: unknown;
    created_at: Date;
    email: string | null;
  }>(
    `select l.id, l.user_id, l.delta, l.reason, l.meta, l.created_at, u.email
     from credit_ledger l
     left join "user" u on u.id = l.user_id
     order by l.created_at desc
     limit $1`,
    [limit],
  );
  return result.rows;
}

export async function listUsersWithCredits() {
  const result = await pool.query<{
    id: string;
    email: string;
    name: string;
    role: string | null;
    balance: number | null;
    period_grant: number | null;
    is_unlimited: boolean | null;
  }>(
    `select u.id, u.email, u.name, u.role,
            c.balance, c.period_grant, c.is_unlimited
     from "user" u
     left join user_credits c on c.user_id = u.id
     order by u."createdAt" desc
     limit 200`,
  );
  return result.rows;
}
