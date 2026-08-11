import "server-only";

import { pool } from "@/lib/db";
import { getDeckWithCards, mapCard } from "@/lib/data/decks";
import type { Flashcard, QuizSession } from "@/lib/types/flashcard";
import { shuffleIds } from "@/lib/study/shuffle";

export type { QuizSession };

function mapSession(row: {
  id: string;
  deck_id: string;
  user_id: string;
  question_order: string[];
  current_index: number;
  score: number;
  total: number;
  started_at: Date;
  completed_at: Date | null;
}): QuizSession {
  return {
    id: row.id,
    deckId: row.deck_id,
    userId: row.user_id,
    questionOrder: row.question_order ?? [],
    currentIndex: row.current_index,
    score: row.score,
    total: row.total,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

/** Prefer MCQ cards; fall back to any cards (quiz UI can synthesize choices). */
export function pickQuizCards(cards: Flashcard[]): Flashcard[] {
  const mcq = cards.filter(
    (card) => card.cardType === "mcq" && (card.options?.length ?? 0) >= 2,
  );
  return mcq.length >= 3 ? mcq : cards;
}

export async function startQuizSession(input: {
  deckId: string;
  userId: string;
}): Promise<{ session: QuizSession; cards: Flashcard[] }> {
  const deck = await getDeckWithCards(input.deckId, input.userId);
  if (!deck || deck.generationStatus !== "complete") {
    throw new Error("Deck not ready for quiz");
  }
  const poolCards = pickQuizCards(deck.cards);
  if (poolCards.length < 1) throw new Error("No cards available for quiz");

  const ordered = shuffleIds(poolCards.map((card) => card.id));
  const result = await pool.query({
    text: `insert into quiz_sessions (
      deck_id, user_id, question_order, current_index, score, total
    ) values ($1, $2, $3::uuid[], 0, 0, $4)
    returning *`,
    values: [input.deckId, input.userId, ordered, ordered.length],
  });

  return {
    session: mapSession(result.rows[0]),
    cards: deck.cards,
  };
}

export async function getQuizSession(
  sessionId: string,
  userId: string,
): Promise<QuizSession | null> {
  const result = await pool.query(
    "select * from quiz_sessions where id = $1 and user_id = $2",
    [sessionId, userId],
  );
  return result.rows[0] ? mapSession(result.rows[0]) : null;
}

export async function answerQuizQuestion(input: {
  sessionId: string;
  userId: string;
  cardId: string;
  selectedOption: string;
  correctAnswer: string;
}): Promise<{ session: QuizSession; isCorrect: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const sessionResult = await client.query(
      `select * from quiz_sessions
       where id = $1 and user_id = $2 for update`,
      [input.sessionId, input.userId],
    );
    if (!sessionResult.rows[0]) throw new Error("Quiz session not found");
    const session = mapSession(sessionResult.rows[0]);
    if (session.completedAt) throw new Error("Quiz already finished");

    const expectedId = session.questionOrder[session.currentIndex];
    if (expectedId !== input.cardId) {
      throw new Error("Answer out of order");
    }

    const isCorrect =
      input.selectedOption.trim().toLowerCase() ===
      input.correctAnswer.trim().toLowerCase();

    await client.query(
      `insert into quiz_answers (quiz_session_id, card_id, selected_option, is_correct)
       values ($1, $2, $3, $4)
       on conflict (quiz_session_id, card_id) do nothing`,
      [input.sessionId, input.cardId, input.selectedOption, isCorrect],
    );

    const nextIndex = session.currentIndex + 1;
    const nextScore = session.score + (isCorrect ? 1 : 0);
    const done = nextIndex >= session.total;

    const updated = await client.query(
      `update quiz_sessions
       set current_index = $3,
           score = $4,
           completed_at = case when $5 then now() else null end,
           updated_at = now()
       where id = $1 and user_id = $2
       returning *`,
      [input.sessionId, input.userId, nextIndex, nextScore, done],
    );

    await client.query("commit");
    return { session: mapSession(updated.rows[0]), isCorrect };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getCardForQuiz(
  cardId: string,
): Promise<Flashcard | null> {
  const result = await pool.query("select * from cards where id = $1", [cardId]);
  return result.rows[0] ? mapCard(result.rows[0]) : null;
}
