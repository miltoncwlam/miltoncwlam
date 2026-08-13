import "server-only";

import { pool } from "@/lib/db";
import { mapCard, mapDeck } from "@/lib/data/decks";
import {
  encyclopediaAnchorGrade,
  encyclopediaBandForGrade,
} from "@/lib/community/hk-curriculum";
import type {
  DeckSummary,
  DeckWithCards,
  GeneratedFlashcard,
} from "@/lib/types/flashcard";

export const COMMUNITY_SEED_OWNER = "system:study-a-community";

export type CommunityDeckSummary = DeckSummary & {
  isSeed: boolean;
  isFeatured: boolean;
  likeCount: number;
  coverImageUrl: string | null;
};

export async function listPublicCommunityDecks(input?: {
  query?: string;
  subject?: string;
  grade?: string;
}): Promise<CommunityDeckSummary[]> {
  const clauses = [
    `d.visibility = 'public'`,
    `d.moderation_status = 'approved'`,
    `d.generation_status = 'complete'`,
  ];
  const values: unknown[] = [];

  if (input?.subject?.trim()) {
    values.push(input.subject.trim().toLowerCase());
    clauses.push(`lower(d.subject_tag) = $${values.length}`);
  }

  if (input?.grade?.trim()) {
    const grade = input.grade.trim().toLowerCase();
    const band = encyclopediaBandForGrade(grade);
    const anchor = band ? encyclopediaAnchorGrade(band) : grade;
    values.push(grade);
    const gradeIdx = values.length;
    values.push(anchor);
    const anchorIdx = values.length;
    clauses.push(
      `(d.grade_tag is null
        or lower(d.grade_tag) = $${gradeIdx}
        or (d.is_featured and lower(d.grade_tag) = $${anchorIdx}))`,
    );
  }

  if (input?.query?.trim()) {
    values.push(`%${input.query.trim().toLowerCase()}%`);
    clauses.push(
      `(lower(d.title) like $${values.length}
        or lower(coalesce(d.subject_tag, '')) like $${values.length}
        or lower(coalesce(d.grade_tag, '')) like $${values.length})`,
    );
  }

  const result = await pool.query<
    Parameters<typeof mapDeck>[0] & {
      card_count: string;
      is_featured: boolean;
      like_count: number;
      cover_image_url: string | null;
    }
  >(
    `select d.*, count(c.id)::text as card_count,
            (select c2.image_url from cards c2
             where c2.deck_id = d.id and c2.image_url is not null
             order by c2.sort_order limit 1) as cover_image_url
     from decks d
     left join cards c on c.deck_id = d.id
     where ${clauses.join(" and ")}
     group by d.id
     order by d.is_featured desc, d.like_count desc, d.is_seed desc,
              d.listed_at desc nulls last, d.updated_at desc
     limit 200`,
    values,
  );

  return result.rows.map((row) => {
    const deck = mapDeck(row);
    return {
      id: deck.id,
      title: deck.title,
      sourceType: deck.sourceType,
      generationStatus: deck.generationStatus,
      generationError: deck.generationError,
      isShared: deck.isShared,
      visibility: deck.visibility,
      subjectTag: deck.subjectTag,
      gradeTag: deck.gradeTag,
      archivedAt: deck.archivedAt,
      folderTag: deck.folderTag,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      cardCount: Number(row.card_count),
      isSeed: deck.isSeed,
      isFeatured: Boolean(row.is_featured),
      likeCount: Number(row.like_count ?? 0),
      coverImageUrl: row.cover_image_url ?? null,
    };
  });
}

export async function listCommunitySubjects(): Promise<string[]> {
  const result = await pool.query<{ subject_tag: string }>(
    `select distinct subject_tag
     from decks
     where visibility = 'public'
       and moderation_status = 'approved'
       and subject_tag is not null
     order by subject_tag`,
  );
  return result.rows.map((row) => row.subject_tag);
}

export async function listCommunityGrades(): Promise<string[]> {
  const result = await pool.query<{ grade_tag: string }>(
    `select distinct grade_tag
     from decks
     where visibility = 'public'
       and moderation_status = 'approved'
       and grade_tag is not null
     order by grade_tag`,
  );
  return result.rows.map((row) => row.grade_tag);
}

export async function getPublicCommunityDeck(
  deckId: string,
): Promise<DeckWithCards | null> {
  const deckResult = await pool.query(
    `select * from decks
     where id = $1
       and visibility = 'public'
       and moderation_status = 'approved'`,
    [deckId],
  );
  if (!deckResult.rows[0]) return null;

  const cardResult = await pool.query(
    "select * from cards where deck_id = $1 order by sort_order, created_at",
    [deckId],
  );

  return {
    ...mapDeck(deckResult.rows[0]),
    cards: cardResult.rows.map(mapCard),
  };
}

export async function copyDeckByIdToUser(
  sourceDeckId: string,
  userId: string,
): Promise<string> {
  const deckResult = await pool.query(
    `select * from decks where id = $1 and generation_status = 'complete'`,
    [sourceDeckId],
  );
  if (!deckResult.rows[0]) throw new Error("Deck not found");
  const source = {
    ...mapDeck(deckResult.rows[0]),
    cards: (
      await pool.query(
        "select * from cards where deck_id = $1 order by sort_order, created_at",
        [sourceDeckId],
      )
    ).rows.map(mapCard),
  };

  return insertDeckCopy(source, userId);
}

export async function copyCommunityDeckToUser(
  sourceDeckId: string,
  userId: string,
): Promise<string> {
  const source = await getPublicCommunityDeck(sourceDeckId);
  if (!source) throw new Error("Community deck not found");
  return insertDeckCopy(source, userId);
}

async function insertDeckCopy(
  source: DeckWithCards,
  userId: string,
): Promise<string> {

  const client = await pool.connect();
  try {
    await client.query("begin");
    const deckResult = await client.query<{ id: string }>(
      `insert into decks (
        user_id, title, source_type, source_content,
        generation_status, share_token, is_shared, visibility,
        subject_tag, is_seed
      ) values (
        $1, $2, 'text', null, 'complete', null, false, 'private', $3, false
      ) returning id`,
      [userId, `${source.title} (copy)`, source.subjectTag],
    );
    const deckId = deckResult.rows[0].id;

    for (const [index, card] of source.cards.entries()) {
      await client.query(
        `insert into cards (
          deck_id, front, back, hint, category, sort_order, card_type, options, image_url, image_attribution
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          deckId,
          card.front,
          card.back,
          card.hint,
          card.category,
          index,
          card.cardType,
          card.options ? JSON.stringify(card.options) : null,
          card.imageUrl,
          card.imageAttribution ? JSON.stringify(card.imageAttribution) : null,
        ],
      );
    }

    await client.query("commit");
    return deckId;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function setDeckVisibility(input: {
  deckId: string;
  userId: string;
  visibility: "private" | "unlisted" | "public";
  shareTokenHash?: string | null;
  moderationStatus?: "none" | "pending" | "approved" | "rejected";
  moderationReasons?: string | null;
}): Promise<boolean> {
  const listed =
    input.visibility === "public" && input.moderationStatus === "approved";
  const result = await pool.query(
    `update decks
     set visibility = $3,
         is_shared = ($3 = 'unlisted' or $3 = 'public'),
         share_token_hash = coalesce($4, share_token_hash),
         moderation_status = coalesce($5, moderation_status),
         moderation_reasons = $6,
         listed_at = case when $7 then coalesce(listed_at, now()) else null end
     where id = $1 and user_id = $2 and is_seed = false`,
    [
      input.deckId,
      input.userId,
      input.visibility,
      input.shareTokenHash ?? null,
      input.moderationStatus ?? null,
      input.moderationReasons ?? null,
      listed,
    ],
  );
  return Boolean(result.rowCount);
}

export async function upsertSeedCommunityDeck(input: {
  slug: string;
  title: string;
  subjectTag: string;
  gradeTag?: string | null;
  cards: GeneratedFlashcard[];
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<{ id: string }>(
      `select id from decks
       where user_id = $1 and is_seed = true and source_content = $2`,
      [COMMUNITY_SEED_OWNER, `seed:${input.slug}`],
    );

    let deckId = existing.rows[0]?.id;
    if (!deckId) {
      const created = await client.query<{ id: string }>(
        `insert into decks (
          user_id, title, source_type, source_content,
          generation_status, share_token, is_shared, visibility,
          subject_tag, grade_tag, moderation_status, listed_at, is_seed
        ) values (
          $1, $2, 'text', $3, 'complete', null, true, 'public',
          $4, $5, 'approved', now(), true
        ) returning id`,
        [
          COMMUNITY_SEED_OWNER,
          input.title,
          `seed:${input.slug}`,
          input.subjectTag,
          input.gradeTag ?? null,
        ],
      );
      deckId = created.rows[0].id;
    } else {
      await client.query(
        `update decks
         set title = $2, subject_tag = $3, grade_tag = $4,
             visibility = 'public',
             moderation_status = 'approved', is_shared = true,
             listed_at = coalesce(listed_at, now())
         where id = $1`,
        [deckId, input.title, input.subjectTag, input.gradeTag ?? null],
      );
      await client.query("delete from cards where deck_id = $1", [deckId]);
    }

    for (const [index, card] of input.cards.entries()) {
      await client.query(
        `insert into cards (
          deck_id, front, back, hint, category, sort_order, card_type, options
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          deckId,
          card.front,
          card.back,
          card.hint ?? null,
          card.category ?? null,
          index,
          card.type ?? "qa",
          card.options ? JSON.stringify(card.options) : null,
        ],
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
