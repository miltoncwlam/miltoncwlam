import "server-only";

import { PLAY_STAKE, assertPlayScore, playPayout } from "@/lib/credits/play";
import {
  assertAndSpendCredits,
  assertPlayStakeRateLimit,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { rememberStreak } from "@/lib/data/streaks";
import { pool } from "@/lib/db";
import type { PlayTemplateId } from "@/lib/play/templates";

export type GameRun = {
  id: string;
  deckId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
  stake: number;
  payout: number;
  clientKey: string;
  classLinkId: string | null;
};

type GameRow = {
  id: string;
  deck_id: string;
  template: string;
  score: number;
  max_score: number;
  payload: {
    clientKey?: string;
    stake?: number;
    payout?: number;
    classLinkId?: string;
  } | null;
  completed_at: Date | null;
};

function mapRow(row: GameRow): GameRun {
  const payload = row.payload ?? {};
  return {
    id: row.id,
    deckId: row.deck_id,
    template: row.template as PlayTemplateId,
    score: row.score,
    maxScore: row.max_score,
    stake: payload.stake ?? PLAY_STAKE,
    payout: payload.payout ?? 0,
    clientKey: payload.clientKey ?? "",
    classLinkId: payload.classLinkId ?? null,
  };
}

async function findByClientKey(userId: string, clientKey: string) {
  const result = await pool.query<GameRow>(
    `select id, deck_id, template, score, max_score, payload, completed_at
     from game_runs
     where user_id = $1 and payload->>'clientKey' = $2
     order by created_at desc
     limit 1`,
    [userId, clientKey],
  );
  return result.rows[0] ?? null;
}

export async function startGameRun(input: {
  deckId: string;
  userId: string;
  template: PlayTemplateId;
  clientKey: string;
  classLinkId?: string | null;
}): Promise<GameRun> {
  const existing = await findByClientKey(input.userId, input.clientKey);
  if (existing) return mapRow(existing);

  const credits = await getOrRefreshCredits(input.userId);
  await assertPlayStakeRateLimit(input.userId, {
    isUnlimited: credits.isUnlimited,
  });

  await assertAndSpendCredits({
    userId: input.userId,
    textAmount: PLAY_STAKE,
    reason: "play_stake",
    meta: {
      deckId: input.deckId,
      template: input.template,
      clientKey: input.clientKey,
      classLinkId: input.classLinkId ?? undefined,
    },
  });

  const result = await pool.query<GameRow>(
    `insert into game_runs (
      deck_id, user_id, template, score, max_score, payload, started_at
    ) values ($1, $2, $3, 0, 0, $4::jsonb, now())
    returning id, deck_id, template, score, max_score, payload, completed_at`,
    [
      input.deckId,
      input.userId,
      input.template,
      JSON.stringify({
        clientKey: input.clientKey,
        stake: PLAY_STAKE,
        payout: 0,
        ...(input.classLinkId ? { classLinkId: input.classLinkId } : {}),
      }),
    ],
  );
  return mapRow(result.rows[0]);
}

export async function completeGameRun(input: {
  deckId: string;
  userId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
  cardCount: number;
  clientKey?: string;
}): Promise<GameRun> {
  const row = input.clientKey
    ? await findByClientKey(input.userId, input.clientKey)
    : null;

  if (row?.completed_at) return mapRow(row);

  assertPlayScore({
    score: input.score,
    maxScore: input.maxScore,
    cardCount: input.cardCount,
  });

  const stake = row ? mapRow(row).stake : 0;
  const payout = stake > 0 ? playPayout(input.score, input.maxScore, stake) : 0;

  if (payout > 0) {
    await refundCredits({
      userId: input.userId,
      textAmount: payout,
      reason: "play_win",
      meta: {
        deckId: input.deckId,
        template: input.template,
        score: input.score,
        maxScore: input.maxScore,
      },
    });
  }

  if (row) {
    const updated = await pool.query<GameRow>(
      `update game_runs
       set score = $2,
           max_score = $3,
           completed_at = now(),
           payload = coalesce(payload, '{}'::jsonb) || $4::jsonb
       where id = $1
       returning id, deck_id, template, score, max_score, payload, completed_at`,
      [
        row.id,
        input.score,
        input.maxScore,
        JSON.stringify({ payout }),
      ],
    );
    await rememberStreak(input.userId);
    return mapRow(updated.rows[0]);
  }

  const inserted = await pool.query<GameRow>(
    `insert into game_runs (
      deck_id, user_id, template, score, max_score, payload, completed_at
    ) values ($1, $2, $3, $4, $5, $6::jsonb, now())
    returning id, deck_id, template, score, max_score, payload, completed_at`,
    [
      input.deckId,
      input.userId,
      input.template,
      input.score,
      input.maxScore,
      JSON.stringify({ stake: 0, payout: 0, clientKey: input.clientKey ?? "" }),
    ],
  );
  await rememberStreak(input.userId);
  return mapRow(inserted.rows[0]);
}

export type ClassAssignmentRun = {
  id: string;
  userId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
  stake: number;
  payout: number;
  completedAt: Date;
  classLinkId: string;
};

export async function listClassRunsForDeck(
  deckId: string,
  teacherUserId: string,
) {
  const result = await pool.query<{
    id: string;
    user_id: string;
    template: string;
    score: number;
    max_score: number;
    payload: GameRow["payload"];
    completed_at: Date;
    class_link_id: string;
  }>(
    `select gr.id,
            gr.user_id,
            gr.template,
            gr.score,
            gr.max_score,
            gr.payload,
            gr.completed_at,
            cl.id as class_link_id
     from game_runs gr
     join class_links cl
       on cl.id::text = gr.payload->>'classLinkId'
     where cl.deck_id = $1
       and cl.teacher_user_id = $2
       and gr.completed_at is not null
     order by gr.completed_at desc
     limit 80`,
    [deckId, teacherUserId],
  );
  return result.rows.map(
    (row): ClassAssignmentRun => ({
      id: row.id,
      userId: row.user_id,
      template: row.template as PlayTemplateId,
      score: row.score,
      maxScore: row.max_score,
      stake: row.payload?.stake ?? PLAY_STAKE,
      payout: row.payload?.payout ?? 0,
      completedAt: row.completed_at,
      classLinkId: row.class_link_id,
    }),
  );
}
