import "server-only";

import type { Pool, PoolClient } from "pg";

import { pool } from "@/lib/db";
import {
  CREDIT_PERIOD_DAYS,
  CREDIT_PERIOD_GRANT,
  FREE_GENERATE_LIMIT_DAY,
  FREE_GENERATE_LIMIT_HOUR,
  GENERATE_RATE_LIMIT_WINDOW_MS,
  IMAGE_PERIOD_GRANT,
  PAID_GENERATE_LIMIT_HOUR,
} from "@/lib/credits/config";
import { isPaidOpenRouterModel } from "@/lib/llm/models";

export type CreditPool = "text" | "image";

export type UserCreditBalance = {
  userId: string;
  balance: number;
  imageBalance: number;
  periodStart: Date;
  periodEnd: Date;
  periodGrant: number;
  imagePeriodGrant: number;
  isUnlimited: boolean;
};

type CreditRow = {
  user_id: string;
  balance: number;
  image_balance: number;
  period_start: Date;
  period_end: Date;
  period_grant: number;
  image_period_grant: number;
  is_unlimited?: boolean;
};

function mapRow(row: CreditRow): UserCreditBalance {
  return {
    userId: row.user_id,
    balance: row.balance,
    imageBalance: row.image_balance,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    periodGrant: row.period_grant,
    imagePeriodGrant: row.image_period_grant,
    isUnlimited: Boolean(row.is_unlimited),
  };
}

const CREDIT_SELECT = `user_id, balance, image_balance, period_start, period_end, period_grant, image_period_grant, is_unlimited`;

async function ensureRow(userId: string): Promise<UserCreditBalance> {
  const inserted = await pool.query<CreditRow>(
    `insert into user_credits (
       user_id, balance, image_balance, period_start, period_end, period_grant, image_period_grant
     )
     values (
       $1, $2, $3, date_trunc('week', now()),
       date_trunc('week', now()) + ($4::text || ' days')::interval, $2, $3
     )
     on conflict (user_id) do nothing
     returning ${CREDIT_SELECT}`,
    [userId, CREDIT_PERIOD_GRANT, IMAGE_PERIOD_GRANT, String(CREDIT_PERIOD_DAYS)],
  );
  if (inserted.rows[0]) return mapRow(inserted.rows[0]);

  const existing = await pool.query<CreditRow>(
    `select ${CREDIT_SELECT} from user_credits where user_id = $1`,
    [userId],
  );
  return mapRow(existing.rows[0]);
}

async function insertLedger(
  client: Pool | PoolClient,
  input: {
    userId: string;
    delta: number;
    pool: CreditPool;
    reason: string;
    meta?: Record<string, unknown>;
  },
) {
  await client.query(
    `insert into credit_ledger (user_id, delta, pool, reason, meta)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.userId,
      input.delta,
      input.pool,
      input.reason,
      JSON.stringify(input.meta ?? {}),
    ],
  );
}

/** Refill both pools when the weekly cycle ends. */
export async function getOrRefreshCredits(
  userId: string,
): Promise<UserCreditBalance> {
  const current = await ensureRow(userId);
  if (current.isUnlimited || current.periodEnd.getTime() > Date.now()) {
    return current;
  }

  const refreshed = await pool.query<CreditRow>(
    `update user_credits
     set balance = period_grant,
         image_balance = image_period_grant,
         period_start = date_trunc('week', now()),
         period_end = date_trunc('week', now()) + ($2::text || ' days')::interval,
         updated_at = now()
     where user_id = $1
     returning ${CREDIT_SELECT}`,
    [userId, String(CREDIT_PERIOD_DAYS)],
  );
  const row = refreshed.rows[0];

  await insertLedger(pool, {
    userId,
    delta: row.period_grant,
    pool: "text",
    reason: "period_refill",
    meta: { periodDays: CREDIT_PERIOD_DAYS },
  });
  await insertLedger(pool, {
    userId,
    delta: row.image_period_grant,
    pool: "image",
    reason: "period_refill",
    meta: { periodDays: CREDIT_PERIOD_DAYS },
  });

  return mapRow(row);
}

export async function assertAndSpendCredits(input: {
  userId: string;
  textAmount?: number;
  imageAmount?: number;
  reason: string;
  meta?: Record<string, unknown>;
}): Promise<UserCreditBalance> {
  const textAmount = Math.max(0, Math.floor(input.textAmount ?? 0));
  const imageAmount = Math.max(0, Math.floor(input.imageAmount ?? 0));
  if (textAmount <= 0 && imageAmount <= 0) {
    return getOrRefreshCredits(input.userId);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into user_credits (
         user_id, balance, image_balance, period_start, period_end, period_grant, image_period_grant
       )
       values (
         $1, $2, $3, date_trunc('week', now()),
         date_trunc('week', now()) + interval '7 days', $2, $3
       )
       on conflict (user_id) do nothing`,
      [input.userId, CREDIT_PERIOD_GRANT, IMAGE_PERIOD_GRANT],
    );

    const locked = await client.query<CreditRow>(
      `select ${CREDIT_SELECT} from user_credits where user_id = $1 for update`,
      [input.userId],
    );
    let row = locked.rows[0];

    if (row.is_unlimited) {
      if (textAmount > 0) {
        await insertLedger(client, {
          userId: input.userId,
          delta: 0,
          pool: "text",
          reason: input.reason,
          meta: { ...(input.meta ?? {}), unlimited: true },
        });
      }
      if (imageAmount > 0) {
        await insertLedger(client, {
          userId: input.userId,
          delta: 0,
          pool: "image",
          reason: input.reason,
          meta: { ...(input.meta ?? {}), unlimited: true },
        });
      }
      await client.query("commit");
      return mapRow(row);
    }

    if (row.period_end.getTime() <= Date.now()) {
      const refill = await client.query<CreditRow>(
        `update user_credits
         set balance = period_grant,
             image_balance = image_period_grant,
             period_start = date_trunc('week', now()),
             period_end = date_trunc('week', now()) + interval '7 days',
             updated_at = now()
         where user_id = $1
         returning ${CREDIT_SELECT}`,
        [input.userId],
      );
      row = refill.rows[0];
      await insertLedger(client, {
        userId: input.userId,
        delta: row.period_grant,
        pool: "text",
        reason: "period_refill",
      });
      await insertLedger(client, {
        userId: input.userId,
        delta: row.image_period_grant,
        pool: "image",
        reason: "period_refill",
      });
    }

    if (textAmount > 0 && row.balance < textAmount) {
      throw new Error(
        `Not enough energy. Need ${textAmount}, have ${row.balance}. Energy refills each week.`,
      );
    }
    if (imageAmount > 0 && row.image_balance < imageAmount) {
      throw new Error(
        `Not enough image energy. Need ${imageAmount}, have ${row.image_balance}. Image energy refills each week.`,
      );
    }

    const spent = await client.query<CreditRow>(
      `update user_credits
       set balance = balance - $2,
           image_balance = image_balance - $3,
           updated_at = now()
       where user_id = $1
       returning ${CREDIT_SELECT}`,
      [input.userId, textAmount, imageAmount],
    );

    if (textAmount > 0) {
      await insertLedger(client, {
        userId: input.userId,
        delta: -textAmount,
        pool: "text",
        reason: input.reason,
        meta: input.meta,
      });
    }
    if (imageAmount > 0) {
      await insertLedger(client, {
        userId: input.userId,
        delta: -imageAmount,
        pool: "image",
        reason: input.reason,
        meta: input.meta,
      });
    }

    await client.query("commit");
    return mapRow(spent.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Restore energy after a failed generate that already spent. */
export async function refundCredits(input: {
  userId: string;
  textAmount?: number;
  imageAmount?: number;
  reason?: string;
  meta?: Record<string, unknown>;
}): Promise<UserCreditBalance | null> {
  const textAmount = Math.max(0, Math.floor(input.textAmount ?? 0));
  const imageAmount = Math.max(0, Math.floor(input.imageAmount ?? 0));
  if (textAmount <= 0 && imageAmount <= 0) return null;

  const client = await pool.connect();
  try {
    await client.query("begin");
    const locked = await client.query<CreditRow>(
      `select ${CREDIT_SELECT} from user_credits where user_id = $1 for update`,
      [input.userId],
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query("rollback");
      return null;
    }

    if (row.is_unlimited) {
      if (textAmount > 0) {
        await insertLedger(client, {
          userId: input.userId,
          delta: 0,
          pool: "text",
          reason: input.reason ?? "generate_refund",
          meta: { ...(input.meta ?? {}), unlimited: true },
        });
      }
      if (imageAmount > 0) {
        await insertLedger(client, {
          userId: input.userId,
          delta: 0,
          pool: "image",
          reason: input.reason ?? "generate_refund",
          meta: { ...(input.meta ?? {}), unlimited: true },
        });
      }
      await client.query("commit");
      return mapRow(row);
    }

    const refunded = await client.query<CreditRow>(
      `update user_credits
       set balance = balance + $2,
           image_balance = image_balance + $3,
           updated_at = now()
       where user_id = $1
       returning ${CREDIT_SELECT}`,
      [input.userId, textAmount, imageAmount],
    );

    if (textAmount > 0) {
      await insertLedger(client, {
        userId: input.userId,
        delta: textAmount,
        pool: "text",
        reason: input.reason ?? "generate_refund",
        meta: input.meta,
      });
    }
    if (imageAmount > 0) {
      await insertLedger(client, {
        userId: input.userId,
        delta: imageAmount,
        pool: "image",
        reason: input.reason ?? "generate_refund",
        meta: input.meta,
      });
    }

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
export async function assertGenerateRateLimit(
  userId: string,
  input?: { provider?: string; model?: string | null; isUnlimited?: boolean },
): Promise<void> {
  if (input?.isUnlimited) return;

  const provider = input?.provider ?? "openrouter";
  const model = input?.model ?? "";
  const isFree =
    provider === "openrouter" && !isPaidOpenRouterModel(model);
  const hourlyMax = isFree
    ? FREE_GENERATE_LIMIT_HOUR
    : PAID_GENERATE_LIMIT_HOUR;

  const hourResult = await pool.query<{ count: string }>(
    `select count(*)::text as count
     from credit_ledger
     where user_id = $1
       and pool = 'text'
       and reason in ('generate_deck', 'generate_quiz')
       and created_at > now() - ($2::text || ' milliseconds')::interval`,
    [userId, String(GENERATE_RATE_LIMIT_WINDOW_MS)],
  );
  const hourCount = Number(hourResult.rows[0]?.count ?? 0);
  if (hourCount >= hourlyMax) {
    throw new Error(
      `Too many generates this hour (max ${hourlyMax}). Try again later.`,
    );
  }

  if (isFree) {
    const dayResult = await pool.query<{ count: string }>(
      `select count(*)::text as count
       from credit_ledger
       where user_id = $1
         and pool = 'text'
         and reason in ('generate_deck', 'generate_quiz')
         and created_at > now() - interval '1 day'`,
      [userId],
    );
    const dayCount = Number(dayResult.rows[0]?.count ?? 0);
    if (dayCount >= FREE_GENERATE_LIMIT_DAY) {
      throw new Error(
        `Too many catalog-model generates today (max ${FREE_GENERATE_LIMIT_DAY}). Try DeepSeek V4 Flash or Qwen 3.7 Flash, or wait until tomorrow.`,
      );
    }
  }
}

export async function setUserEnergySettings(input: {
  userId: string;
  periodGrant: number;
  imagePeriodGrant?: number;
  isUnlimited: boolean;
  balance?: number;
  imageBalance?: number;
}): Promise<UserCreditBalance> {
  const grant = Math.max(0, Math.floor(input.periodGrant));
  const imageGrant = Math.max(
    0,
    Math.floor(input.imagePeriodGrant ?? IMAGE_PERIOD_GRANT),
  );
  const result = await pool.query<CreditRow>(
    `insert into user_credits (
       user_id, balance, image_balance, period_start, period_end,
       period_grant, image_period_grant, is_unlimited
     ) values (
       $1,
       coalesce($5, $2),
       coalesce($6, $3),
       date_trunc('week', now()),
       date_trunc('week', now()) + interval '7 days',
       $2,
       $3,
       $4
     )
     on conflict (user_id) do update
     set period_grant = excluded.period_grant,
         image_period_grant = excluded.image_period_grant,
         is_unlimited = excluded.is_unlimited,
         balance = coalesce($5, user_credits.balance),
         image_balance = coalesce($6, user_credits.image_balance),
         updated_at = now()
     returning ${CREDIT_SELECT}`,
    [
      input.userId,
      grant,
      imageGrant,
      input.isUnlimited,
      input.balance ?? null,
      input.imageBalance ?? null,
    ],
  );

  await insertLedger(pool, {
    userId: input.userId,
    delta: 0,
    pool: "text",
    reason: "admin_adjust",
    meta: {
      periodGrant: grant,
      imagePeriodGrant: imageGrant,
      isUnlimited: input.isUnlimited,
      balance: input.balance ?? null,
      imageBalance: input.imageBalance ?? null,
    },
  });

  return mapRow(result.rows[0]);
}

export async function listCreditLedger(limit = 100) {
  const result = await pool.query<{
    id: string;
    user_id: string;
    delta: number;
    pool: CreditPool;
    reason: string;
    meta: unknown;
    created_at: Date;
    email: string | null;
  }>(
    `select l.id, l.user_id, l.delta, l.pool, l.reason, l.meta, l.created_at, u.email
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
    image_balance: number | null;
    period_grant: number | null;
    image_period_grant: number | null;
    is_unlimited: boolean | null;
  }>(
    `select u.id, u.email, u.name, u.role,
            c.balance, c.image_balance, c.period_grant, c.image_period_grant, c.is_unlimited
     from "user" u
     left join user_credits c on c.user_id = u.id
     order by u."createdAt" desc
     limit 200`,
  );
  return result.rows;
}
