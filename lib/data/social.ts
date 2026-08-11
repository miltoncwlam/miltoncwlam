import "server-only";

import { pool } from "@/lib/db";

export async function likeCommunityDeck(deckId: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into deck_likes (deck_id, user_id)
       values ($1, $2)
       on conflict do nothing
       returning deck_id`,
      [deckId, userId],
    );
    if (inserted.rowCount) {
      await client.query(
        `update decks set like_count = like_count + 1 where id = $1`,
        [deckId],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function unlikeCommunityDeck(deckId: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const deleted = await client.query(
      `delete from deck_likes where deck_id = $1 and user_id = $2`,
      [deckId, userId],
    );
    if (deleted.rowCount) {
      await client.query(
        `update decks set like_count = greatest(like_count - 1, 0) where id = $1`,
        [deckId],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function addDeckComment(
  deckId: string,
  userId: string,
  body: string,
) {
  const result = await pool.query(
    `insert into deck_comments (deck_id, user_id, body)
     values ($1, $2, $3)
     returning id, body, created_at`,
    [deckId, userId, body],
  );
  return result.rows[0];
}

export async function listDeckComments(deckId: string, limit = 30) {
  const result = await pool.query<{
    id: string;
    user_id: string;
    body: string;
    created_at: Date;
  }>(
    `select id, user_id, body, created_at
     from deck_comments
     where deck_id = $1
     order by created_at desc
     limit $2`,
    [deckId, limit],
  );
  return result.rows;
}

export async function userLikedDeck(deckId: string, userId: string) {
  const result = await pool.query(
    `select 1 from deck_likes where deck_id = $1 and user_id = $2 limit 1`,
    [deckId, userId],
  );
  return Boolean(result.rowCount);
}

export async function createModerationReport(input: {
  deckId: string;
  reporterUserId: string;
  reason: string;
  details?: string;
  appealNote?: string;
}) {
  await pool.query(
    `insert into moderation_reports (
       deck_id, reporter_user_id, reason, details, appeal_note
     ) values ($1, $2, $3, $4, $5)`,
    [
      input.deckId,
      input.reporterUserId,
      input.reason,
      input.details ?? null,
      input.appealNote ?? null,
    ],
  );
}
