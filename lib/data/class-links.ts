import "server-only";

import { pool } from "@/lib/db";
import { copyDeckByIdToUser } from "@/lib/data/community";
import { hashShareToken } from "@/lib/security/share-token";

export async function createClassLink(
  deckId: string,
  teacherUserId: string,
  token: string,
) {
  const result = await pool.query<{ id: string }>(
    `insert into class_links (deck_id, teacher_user_id, token_hash)
     values ($1, $2, $3)
     returning id`,
    [deckId, teacherUserId, hashShareToken(token)],
  );
  return result.rows[0]?.id ?? null;
}

export async function getClassLinkByToken(token: string) {
  const result = await pool.query<{
    id: string;
    deck_id: string;
    teacher_user_id: string;
    join_count: number;
    revoked_at: Date | null;
    title: string;
  }>(
    `select cl.id, cl.deck_id, cl.teacher_user_id, cl.join_count, cl.revoked_at, d.title
     from class_links cl
     join decks d on d.id = cl.deck_id
     where cl.token_hash = $1
     limit 1`,
    [hashShareToken(token)],
  );
  return result.rows[0] ?? null;
}

export async function getClassLinkById(id: string) {
  const result = await pool.query<{
    id: string;
    deck_id: string;
    teacher_user_id: string;
    revoked_at: Date | null;
  }>(
    `select id, deck_id, teacher_user_id, revoked_at
     from class_links
     where id = $1
     limit 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function joinClassLink(token: string, studentUserId: string) {
  const link = await getClassLinkByToken(token);
  if (!link || link.revoked_at) {
    throw new Error("Class link is invalid or revoked");
  }
  if (link.teacher_user_id === studentUserId) {
    throw new Error("Teachers cannot join their own class link");
  }

  const copiedId = await copyDeckByIdToUser(link.deck_id, studentUserId);
  await pool.query(
    `update class_links set join_count = join_count + 1 where id = $1`,
    [link.id],
  );
  await pool.query(
    `update decks set class_join_count = class_join_count + 1 where id = $1`,
    [link.deck_id],
  );
  return { deckId: copiedId, joinCount: link.join_count + 1, title: link.title, classLinkId: link.id };
}

export async function listClassLinksForDeck(deckId: string, teacherUserId: string) {
  const result = await pool.query<{
    id: string;
    join_count: number;
    created_at: Date;
    revoked_at: Date | null;
  }>(
    `select id, join_count, created_at, revoked_at
     from class_links
     where deck_id = $1 and teacher_user_id = $2
     order by created_at desc`,
    [deckId, teacherUserId],
  );
  return result.rows;
}

export async function revokeClassLink(linkId: string, teacherUserId: string) {
  await pool.query(
    `update class_links set revoked_at = now()
     where id = $1 and teacher_user_id = $2 and revoked_at is null`,
    [linkId, teacherUserId],
  );
}
