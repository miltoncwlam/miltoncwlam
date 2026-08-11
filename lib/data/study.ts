import "server-only";

import { pool } from "@/lib/db";
import { applySm2, defaultSrsState } from "@/lib/study/sm2";
import { shuffleIds } from "@/lib/study/shuffle";
import type { CardRating, StudySession } from "@/lib/types/flashcard";

type SessionRow = {
  id: string;
  deck_id: string;
  user_id: string;
  card_order: string[];
  current_index: number;
  started_at: Date;
  completed_at: Date | null;
};

function mapSession(row: SessionRow): StudySession {
  return {
    id: row.id,
    deckId: row.deck_id,
    userId: row.user_id,
    cardOrder: row.card_order,
    currentIndex: row.current_index,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

async function getOwnedCardIds(deckId: string, userId: string) {
  const result = await pool.query<{ id: string }>(
    `select c.id
     from cards c
     join decks d on d.id = c.deck_id
     where d.id = $1 and d.user_id = $2
     order by c.sort_order, c.created_at`,
    [deckId, userId],
  );
  return result.rows.map((row) => row.id);
}

async function getSharedCardIds(deckId: string) {
  const result = await pool.query<{ id: string }>(
    `select c.id
     from cards c
     join decks d on d.id = c.deck_id
     where d.id = $1 and d.is_shared = true
     order by c.sort_order, c.created_at`,
    [deckId],
  );
  return result.rows.map((row) => row.id);
}

export async function getLatestStudySession(
  deckId: string,
  userId: string,
): Promise<StudySession | null> {
  const result = await pool.query<SessionRow>(
    `select * from study_sessions
     where deck_id = $1 and user_id = $2
     order by started_at desc
     limit 1`,
    [deckId, userId],
  );
  return result.rows[0] ? mapSession(result.rows[0]) : null;
}

async function orderCardsForStudy(
  deckId: string,
  userId: string,
  mode: "all" | "due",
  shuffled: boolean,
): Promise<string[]> {
  if (mode === "due") {
    const result = await pool.query<{ id: string }>(
      `select c.id
       from cards c
       join decks d on d.id = c.deck_id
       left join card_srs s on s.card_id = c.id and s.user_id = $2
       where d.id = $1 and d.user_id = $2
         and (s.due_at is null or s.due_at <= now())
       order by coalesce(s.due_at, to_timestamp(0)) asc, c.sort_order, c.created_at`,
      [deckId, userId],
    );
    const ids = result.rows.map((row) => row.id);
    if (!ids.length) return [];
    return shuffled ? shuffleIds(ids) : ids;
  }

  const cardIds = await getOwnedCardIds(deckId, userId);
  if (!cardIds.length) return [];

  // Due / new cards first, then later reviews
  const ranked = await pool.query<{ id: string }>(
    `select c.id
     from cards c
     join decks d on d.id = c.deck_id
     left join card_srs s on s.card_id = c.id and s.user_id = $2
     where d.id = $1 and d.user_id = $2
     order by
       case when s.due_at is null or s.due_at <= now() then 0 else 1 end,
       coalesce(s.due_at, to_timestamp(0)) asc,
       c.sort_order,
       c.created_at`,
    [deckId, userId],
  );
  const ids = ranked.rows.map((row) => row.id);
  return shuffled ? shuffleIds(ids) : ids;
}

export async function countDueCards(
  deckId: string,
  userId: string,
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `select count(*)::text as count
     from cards c
     join decks d on d.id = c.deck_id
     left join card_srs s on s.card_id = c.id and s.user_id = $2
     where d.id = $1 and d.user_id = $2
       and (s.due_at is null or s.due_at <= now())`,
    [deckId, userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function startStudySession(
  deckId: string,
  userId: string,
  shuffled = false,
  mode: "all" | "due" = "all",
): Promise<StudySession> {
  const order = await orderCardsForStudy(deckId, userId, mode, shuffled);
  if (!order.length) {
    throw new Error(
      mode === "due"
        ? "No cards are due right now"
        : "This deck has no cards",
    );
  }

  const result = await pool.query<SessionRow>(
    `insert into study_sessions (deck_id, user_id, card_order)
     values ($1, $2, $3::uuid[])
     returning *`,
    [deckId, userId, order],
  );
  return mapSession(result.rows[0]);
}

export async function startSharedStudySession(
  deckId: string,
  userId: string,
): Promise<StudySession> {
  const cardIds = await getSharedCardIds(deckId);
  if (!cardIds.length) throw new Error("Shared deck not found");
  const result = await pool.query<SessionRow>(
    `insert into study_sessions (deck_id, user_id, card_order)
     values ($1, $2, $3::uuid[])
     returning *`,
    [deckId, userId, cardIds],
  );
  return mapSession(result.rows[0]);
}

export async function restartStudySession(
  sessionId: string,
  userId: string,
  shuffled = false,
): Promise<StudySession> {
  const existing = await pool.query<SessionRow>(
    "select * from study_sessions where id = $1 and user_id = $2",
    [sessionId, userId],
  );
  const session = existing.rows[0];
  if (!session) throw new Error("Study session not found");

  const cardIds = await getOwnedCardIds(session.deck_id, userId);
  const order = shuffled ? shuffleIds(cardIds) : cardIds;
  const result = await pool.query<SessionRow>(
    `update study_sessions
     set card_order = $3::uuid[], current_index = 0,
         started_at = now(), completed_at = null
     where id = $1 and user_id = $2
     returning *`,
    [sessionId, userId, order],
  );
  return mapSession(result.rows[0]);
}

export async function rateAndAdvance(input: {
  sessionId: string;
  userId: string;
  cardId: string;
  rating: CardRating;
}): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const sessionResult = await client.query<SessionRow>(
      `select * from study_sessions
       where id = $1 and user_id = $2
       for update`,
      [input.sessionId, input.userId],
    );
    const session = sessionResult.rows[0];
    if (!session || session.card_order[session.current_index] !== input.cardId) {
      throw new Error("Invalid study card");
    }

    await client.query(
      `insert into card_reviews (card_id, user_id, rating, study_session_id)
       values ($1, $2, $3, $4)`,
      [input.cardId, input.userId, input.rating, input.sessionId],
    );

    const prior = await client.query<{
      ease_factor: number;
      interval_days: number;
      repetitions: number;
      due_at: Date;
      last_rating: CardRating | null;
    }>(
      `select ease_factor, interval_days, repetitions, due_at, last_rating
       from card_srs
       where user_id = $1 and card_id = $2
       for update`,
      [input.userId, input.cardId],
    );
    const previous = prior.rows[0]
      ? {
          easeFactor: prior.rows[0].ease_factor,
          intervalDays: prior.rows[0].interval_days,
          repetitions: prior.rows[0].repetitions,
          dueAt: prior.rows[0].due_at,
          lastRating: prior.rows[0].last_rating,
        }
      : defaultSrsState();
    const nextSrs = applySm2(previous, input.rating);
    await client.query(
      `insert into card_srs (
         user_id, card_id, ease_factor, interval_days, repetitions, due_at, last_rating, updated_at
       ) values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (user_id, card_id) do update
       set ease_factor = excluded.ease_factor,
           interval_days = excluded.interval_days,
           repetitions = excluded.repetitions,
           due_at = excluded.due_at,
           last_rating = excluded.last_rating,
           updated_at = now()`,
      [
        input.userId,
        input.cardId,
        nextSrs.easeFactor,
        nextSrs.intervalDays,
        nextSrs.repetitions,
        nextSrs.dueAt,
        nextSrs.lastRating,
      ],
    );

    const nextIndex = Math.min(
      session.current_index + 1,
      session.card_order.length,
    );
    await client.query(
      `update study_sessions
       set current_index = $3,
           completed_at = case when $3 >= cardinality(card_order) then now() else null end
       where id = $1 and user_id = $2`,
      [input.sessionId, input.userId, nextIndex],
    );
    await client.query("commit");
    return nextIndex;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
