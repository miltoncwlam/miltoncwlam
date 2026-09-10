import "server-only";

import { pool } from "@/lib/db";
import type {
  ArtifactKind,
  ArtifactPayload,
  DeckArtifact,
  ExamAnswers,
  ExamAttempt,
  ExamQuestionResult,
} from "@/lib/types/notebook";

type ArtifactRow = {
  id: string;
  deck_id: string;
  kind: ArtifactKind;
  payload: ArtifactPayload;
  generation_status: DeckArtifact["generationStatus"];
  generation_model: string | null;
  generation_error: string | null;
  created_at: Date;
  updated_at: Date;
};

type AttemptRow = {
  id: string;
  deck_id: string;
  user_id: string;
  answers: ExamAnswers;
  result: ExamQuestionResult[] | null;
  score: number;
  max_score: number;
  created_at: Date;
};

function mapArtifact(row: ArtifactRow): DeckArtifact {
  return {
    id: row.id,
    deckId: row.deck_id,
    kind: row.kind,
    payload: row.payload,
    generationStatus: row.generation_status,
    generationModel: row.generation_model,
    generationError: row.generation_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttempt(row: AttemptRow): ExamAttempt {
  return {
    id: row.id,
    deckId: row.deck_id,
    userId: row.user_id,
    answers: row.answers ?? {},
    result: row.result,
    score: row.score,
    maxScore: row.max_score,
    createdAt: row.created_at,
  };
}

export async function listDeckArtifacts(
  deckId: string,
): Promise<DeckArtifact[]> {
  const result = await pool.query<ArtifactRow>(
    `select * from deck_artifacts
     where deck_id = $1
     order by kind`,
    [deckId],
  );
  return result.rows.map(mapArtifact);
}

export async function getDeckArtifact(
  deckId: string,
  kind: ArtifactKind,
): Promise<DeckArtifact | null> {
  const result = await pool.query<ArtifactRow>(
    `select * from deck_artifacts
     where deck_id = $1 and kind = $2`,
    [deckId, kind],
  );
  return result.rows[0] ? mapArtifact(result.rows[0]) : null;
}

export async function upsertDeckArtifact(input: {
  deckId: string;
  kind: ArtifactKind;
  payload: ArtifactPayload;
  model?: string | null;
}): Promise<DeckArtifact> {
  const result = await pool.query<ArtifactRow>(
    `insert into deck_artifacts (
       deck_id, kind, payload, generation_status, generation_model, generation_error, updated_at
     ) values ($1, $2, $3::jsonb, 'complete', $4, null, now())
     on conflict (deck_id, kind) do update set
       payload = excluded.payload,
       generation_status = 'complete',
       generation_model = excluded.generation_model,
       generation_error = null,
       updated_at = now()
     returning *`,
    [
      input.deckId,
      input.kind,
      JSON.stringify(input.payload),
      input.model ?? null,
    ],
  );
  return mapArtifact(result.rows[0]);
}

export async function markArtifactProcessing(input: {
  deckId: string;
  kind: ArtifactKind;
  model?: string | null;
}): Promise<void> {
  await pool.query(
    `insert into deck_artifacts (
       deck_id, kind, payload, generation_status, generation_model, generation_error, updated_at
     ) values ($1, $2, '{}'::jsonb, 'processing', $3, null, now())
     on conflict (deck_id, kind) do update set
       generation_status = 'processing',
       generation_model = excluded.generation_model,
       generation_error = null,
       updated_at = now()`,
    [input.deckId, input.kind, input.model ?? null],
  );
}

export async function markArtifactFailed(input: {
  deckId: string;
  kind: ArtifactKind;
  message: string;
}): Promise<void> {
  await pool.query(
    `update deck_artifacts
     set generation_status = 'failed',
         generation_error = $3,
         updated_at = now()
     where deck_id = $1 and kind = $2`,
    [input.deckId, input.kind, input.message.slice(0, 500)],
  );
}

export async function listArtifactKindsForDecks(
  deckIds: string[],
): Promise<Map<string, ArtifactKind[]>> {
  const map = new Map<string, ArtifactKind[]>();
  if (!deckIds.length) return map;
  const result = await pool.query<{ deck_id: string; kind: ArtifactKind }>(
    `select deck_id, kind from deck_artifacts
     where deck_id = any($1::uuid[])
       and generation_status = 'complete'`,
    [deckIds],
  );
  for (const row of result.rows) {
    const list = map.get(row.deck_id) ?? [];
    list.push(row.kind);
    map.set(row.deck_id, list);
  }
  return map;
}

export async function insertExamAttempt(input: {
  deckId: string;
  userId: string;
  answers: ExamAnswers;
  result: ExamQuestionResult[];
  score: number;
  maxScore: number;
  classLinkId?: string | null;
}): Promise<ExamAttempt> {
  const result = await pool.query<AttemptRow>(
    `insert into exam_attempts (
       deck_id, user_id, answers, result, score, max_score, class_link_id
     ) values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
     returning *`,
    [
      input.deckId,
      input.userId,
      JSON.stringify(input.answers),
      JSON.stringify(input.result),
      input.score,
      input.maxScore,
      input.classLinkId ?? null,
    ],
  );
  return mapAttempt(result.rows[0]);
}

export type ClassExamAttempt = {
  id: string;
  userId: string;
  score: number;
  maxScore: number;
  createdAt: Date;
};

export async function listClassExamAttemptsForDeck(
  teacherDeckId: string,
  teacherUserId: string,
): Promise<ClassExamAttempt[]> {
  const result = await pool.query<{
    id: string;
    user_id: string;
    score: number;
    max_score: number;
    created_at: Date;
  }>(
    `select ea.id, ea.user_id, ea.score, ea.max_score, ea.created_at
     from exam_attempts ea
     join decks d on d.id = ea.deck_id
     join class_links cl on cl.id = coalesce(ea.class_link_id, d.class_link_id)
     where cl.deck_id = $1
       and cl.teacher_user_id = $2
     order by ea.created_at desc
     limit 80`,
    [teacherDeckId, teacherUserId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    score: row.score,
    maxScore: row.max_score,
    createdAt: row.created_at,
  }));
}

export async function getLatestExamAttempt(
  deckId: string,
  userId: string,
): Promise<ExamAttempt | null> {
  const result = await pool.query<AttemptRow>(
    `select * from exam_attempts
     where deck_id = $1 and user_id = $2
     order by created_at desc
     limit 1`,
    [deckId, userId],
  );
  return result.rows[0] ? mapAttempt(result.rows[0]) : null;
}
