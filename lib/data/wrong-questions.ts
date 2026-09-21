import "server-only";

import { pool } from "@/lib/db";
import { applySm2 } from "@/lib/study/sm2";
import { shouldClearWrongItem, type WrongItemDraft } from "@/lib/study/wrong-questions";
import type { CardRating } from "@/lib/types/flashcard";
import type {
  ExamQuestion,
  ExamStudentAnswer,
  WrongQuestionItem,
} from "@/lib/types/notebook";

type WrongItemRow = {
  id: string;
  deck_id: string;
  user_id: string;
  attempt_id: string | null;
  question_id: string;
  question: ExamQuestion;
  your_answer: ExamStudentAnswer | null;
  feedback: string;
  marks: number;
  marks_awarded: number;
  repetitions: number;
  due_at: Date;
  is_due: boolean;
  last_rating: CardRating | null;
  created_at: Date;
};

function mapWrongItem(row: WrongItemRow): WrongQuestionItem {
  return {
    id: row.id,
    deckId: row.deck_id,
    userId: row.user_id,
    attemptId: row.attempt_id,
    questionId: row.question_id,
    question: row.question,
    yourAnswer: row.your_answer,
    feedback: row.feedback,
    marks: row.marks,
    marksAwarded: row.marks_awarded,
    repetitions: row.repetitions,
    dueAt: row.due_at,
    isDue: row.is_due,
    lastRating: row.last_rating,
    createdAt: row.created_at,
  };
}

/** Re-sitting a paper and missing the same question refreshes the snapshot and restarts SM-2. */
export async function upsertWrongItems(input: {
  deckId: string;
  userId: string;
  attemptId: string;
  items: WrongItemDraft[];
}): Promise<number> {
  if (!input.items.length) return 0;
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const item of input.items) {
      await client.query(
        `insert into exam_wrong_items (
           deck_id, user_id, attempt_id, question_id, question, your_answer,
           feedback, marks, marks_awarded, due_at, updated_at
         ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, now(), now())
         on conflict (deck_id, user_id, question_id) do update set
           attempt_id = excluded.attempt_id,
           question = excluded.question,
           your_answer = excluded.your_answer,
           feedback = excluded.feedback,
           marks = excluded.marks,
           marks_awarded = excluded.marks_awarded,
           ease_factor = 2.5,
           interval_days = 0,
           repetitions = 0,
           due_at = now(),
           last_rating = null,
           cleared_at = null,
           updated_at = now()`,
        [
          input.deckId,
          input.userId,
          input.attemptId,
          item.questionId,
          JSON.stringify(item.question),
          item.yourAnswer == null ? null : JSON.stringify(item.yourAnswer),
          item.feedback.slice(0, 500),
          item.marks,
          item.marksAwarded,
        ],
      );
    }
    await client.query("commit");
    return input.items.length;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listWrongItems(
  deckId: string,
  userId: string,
): Promise<WrongQuestionItem[]> {
  const result = await pool.query<WrongItemRow>(
    `select id, deck_id, user_id, attempt_id, question_id, question, your_answer,
            feedback, marks, marks_awarded, repetitions, due_at,
            (due_at <= now()) as is_due, last_rating, created_at
     from exam_wrong_items
     where deck_id = $1 and user_id = $2 and cleared_at is null
     order by due_at asc, created_at asc`,
    [deckId, userId],
  );
  return result.rows.map(mapWrongItem);
}

export async function countDueWrongItems(
  deckId: string,
  userId: string,
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `select count(*)::text as count
     from exam_wrong_items
     where deck_id = $1 and user_id = $2
       and cleared_at is null and due_at <= now()`,
    [deckId, userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function rateWrongItem(input: {
  itemId: string;
  userId: string;
  rating: CardRating;
}): Promise<{ cleared: boolean; repetitions: number }> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const prior = await client.query<{
      ease_factor: number;
      interval_days: number;
      repetitions: number;
      due_at: Date;
      last_rating: CardRating | null;
    }>(
      `select ease_factor, interval_days, repetitions, due_at, last_rating
       from exam_wrong_items
       where id = $1 and user_id = $2 and cleared_at is null
       for update`,
      [input.itemId, input.userId],
    );
    const row = prior.rows[0];
    if (!row) throw new Error("Wrong question not found");
    const previous = {
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      dueAt: row.due_at,
      lastRating: row.last_rating,
    };
    const next = applySm2(previous, input.rating);
    const cleared = shouldClearWrongItem(input.rating, next.repetitions);
    await client.query(
      `update exam_wrong_items
       set ease_factor = $3,
           interval_days = $4,
           repetitions = $5,
           due_at = $6,
           last_rating = $7,
           cleared_at = case when $8 then now() else null end,
           updated_at = now()
       where id = $1 and user_id = $2`,
      [
        input.itemId,
        input.userId,
        next.easeFactor,
        next.intervalDays,
        next.repetitions,
        next.dueAt,
        input.rating,
        cleared,
      ],
    );
    await client.query("commit");
    return { cleared, repetitions: next.repetitions };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeWrongItem(
  itemId: string,
  userId: string,
): Promise<void> {
  await pool.query(
    `delete from exam_wrong_items where id = $1 and user_id = $2`,
    [itemId, userId],
  );
}
