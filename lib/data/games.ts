import "server-only";

import { pool } from "@/lib/db";
import type { PlayTemplateId } from "@/lib/play/templates";

export type GameRun = {
  id: string;
  deckId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
};

export async function saveGameRun(input: {
  deckId: string;
  userId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
}): Promise<GameRun> {
  const result = await pool.query(
    `insert into game_runs (
      deck_id, user_id, template, score, max_score, completed_at
    ) values ($1, $2, $3, $4, $5, now())
    returning id, deck_id, template, score, max_score`,
    [
      input.deckId,
      input.userId,
      input.template,
      input.score,
      input.maxScore,
    ],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    deckId: row.deck_id,
    template: row.template,
    score: row.score,
    maxScore: row.max_score,
  };
}
