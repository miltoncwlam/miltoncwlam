import "server-only";

import { pool } from "@/lib/db";
import {
  hongKongDate,
  nextStreak,
  visibleStreak,
  type StreakRecord,
  type VisibleStreak,
} from "@/lib/streaks";

type StreakRow = {
  current_count: number;
  longest_count: number;
  last_hk_date: string | null;
};

function mapRow(row: StreakRow | undefined): StreakRecord {
  return {
    currentCount: row?.current_count ?? 0,
    longestCount: row?.longest_count ?? 0,
    lastHkDate: row?.last_hk_date ? row.last_hk_date.slice(0, 10) : null,
  };
}

export async function getStreak(userId: string): Promise<VisibleStreak> {
  try {
    const result = await pool.query<StreakRow>(
      `select current_count, longest_count, last_hk_date::text as last_hk_date
       from user_streaks where user_id = $1`,
      [userId],
    );
    return visibleStreak(mapRow(result.rows[0]), hongKongDate());
  } catch {
    return { current: 0, longest: 0, activeToday: false };
  }
}

export async function touchStreak(userId: string): Promise<StreakRecord> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<StreakRow>(
      `select current_count, longest_count, last_hk_date::text as last_hk_date
       from user_streaks where user_id = $1 for update`,
      [userId],
    );
    const next = nextStreak(mapRow(result.rows[0]), hongKongDate());
    await client.query(
      `insert into user_streaks (user_id, current_count, longest_count, last_hk_date, updated_at)
       values ($1, $2, $3, $4::date, now())
       on conflict (user_id) do update set current_count = excluded.current_count,
       longest_count = excluded.longest_count, last_hk_date = excluded.last_hk_date, updated_at = now()`,
      [userId, next.currentCount, next.longestCount, next.lastHkDate],
    );
    await client.query("commit");
    return next;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function rememberStreak(userId: string) {
  try {
    await touchStreak(userId);
  } catch {
    // Study must still succeed when the optional streak write fails.
  }
}
