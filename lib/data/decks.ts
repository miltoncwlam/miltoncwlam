import "server-only";

import { pool } from "@/lib/db";
import type { ImageAttribution } from "@/lib/images/license";
import type {
  CardType,
  Deck,
  DeckSummary,
  DeckVisibility,
  DeckWithCards,
  Flashcard,
  GeneratedFlashcard,
  LibraryFilter,
  LibrarySort,
  LLMProvider,
  ModerationStatus,
  SourceRetention,
  SourceType,
} from "@/lib/types/flashcard";
import { normalizeLLMProvider } from "@/lib/types/flashcard";

type DeckRow = {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  source_content: string | null;
  storage_path: string | null;
  source_filename: string | null;
  source_mime_type: string | null;
  source_size_bytes: string | null;
  generation_status: Deck["generationStatus"];
  generation_provider: string | null;
  generation_model: string | null;
  generation_error: string | null;
  is_shared: boolean;
  visibility: DeckVisibility;
  subject_tag: string | null;
  grade_tag?: string | null;
  moderation_status: ModerationStatus;
  moderation_reasons: string | null;
  listed_at: Date | null;
  is_seed: boolean;
  archived_at: Date | null;
  folder_tag: string | null;
  created_at: Date;
  updated_at: Date;
};

type CardRow = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint: string | null;
  category: string | null;
  card_type: CardType;
  options: unknown;
  image_url: string | null;
  image_attribution: ImageAttribution | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

function mapOptions(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return null;
}

export function mapDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    sourceType: row.source_type,
    sourceContent: row.source_content,
    storagePath: row.storage_path,
    sourceFilename: row.source_filename,
    sourceMimeType: row.source_mime_type,
    sourceSizeBytes: row.source_size_bytes ? Number(row.source_size_bytes) : null,
    generationStatus: row.generation_status,
    generationProvider: normalizeLLMProvider(row.generation_provider),
    generationModel:
      row.generation_model &&
      ["openai", "anthropic", "google"].includes(row.generation_provider ?? "")
        ? "deepseek/deepseek-v4-flash"
        : row.generation_model,
    generationError: row.generation_error,
    isShared: row.is_shared,
    visibility: row.visibility ?? "private",
    subjectTag: row.subject_tag ?? null,
    gradeTag: row.grade_tag ?? null,
    moderationStatus: row.moderation_status ?? "none",
    moderationReasons: row.moderation_reasons ?? null,
    listedAt: row.listed_at ?? null,
    isSeed: row.is_seed ?? false,
    archivedAt: row.archived_at ?? null,
    folderTag: row.folder_tag ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCard(card: CardRow): Flashcard {
  return {
    id: card.id,
    deckId: card.deck_id,
    front: card.front,
    back: card.back,
    hint: card.hint,
    category: card.category,
    cardType: card.card_type ?? "qa",
    options: mapOptions(card.options),
    imageUrl: card.image_url,
    imageAttribution: card.image_attribution ?? null,
    sortOrder: card.sort_order,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
  };
}

function toSummary(
  row: DeckRow & { card_count: string },
): DeckSummary {
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
  };
}

export async function listDeckFolders(userId: string): Promise<string[]> {
  const result = await pool.query<{ folder_tag: string }>(
    `select distinct folder_tag
     from decks
     where user_id = $1
       and folder_tag is not null
       and archived_at is null
     order by folder_tag`,
    [userId],
  );
  return result.rows.map((row) => row.folder_tag);
}

export async function listDecks(
  userId: string,
  options?: {
    filter?: LibraryFilter;
    sort?: LibrarySort;
    folder?: string;
  },
): Promise<DeckSummary[]> {
  const filter = options?.filter ?? "active";
  const sort = options?.sort ?? "recent";
  const discarded = await purgeFailedGenerations(userId);
  if (discarded.length) {
    const { cleanupDiscardedGenerations } = await import(
      "@/lib/supabase/storage"
    );
    void cleanupDiscardedGenerations(discarded);
  }
  const clauses = [`d.user_id = $1`];
  const values: unknown[] = [userId];

  if (filter === "active") clauses.push(`d.archived_at is null`);
  if (filter === "archived") clauses.push(`d.archived_at is not null`);
  if (filter === "incomplete") {
    clauses.push(`d.archived_at is null`);
    clauses.push(`d.generation_status in ('pending', 'processing', 'failed')`);
  }
  if (filter === "public") {
    clauses.push(`d.archived_at is null`);
    clauses.push(`d.visibility = 'public'`);
  }
  if (filter === "quiz-ready") {
    clauses.push(`d.archived_at is null`);
    clauses.push(`d.generation_status = 'complete'`);
  }
  if (options?.folder?.trim()) {
    values.push(options.folder.trim().toLowerCase());
    clauses.push(`lower(coalesce(d.folder_tag, '')) = $${values.length}`);
  }

  const orderBy =
    sort === "title"
      ? `lower(d.title) asc`
      : sort === "cards"
        ? `count(c.id) desc, d.updated_at desc`
        : `d.updated_at desc`;

  const result = await pool.query<DeckRow & { card_count: string }>(
    `select d.*, count(c.id)::text as card_count
     from decks d
     left join cards c on c.deck_id = d.id
     where ${clauses.join(" and ")}
     group by d.id
     order by ${orderBy}`,
    values,
  );

  return result.rows.map(toSummary);
}

export async function renameDeck(
  deckId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const result = await pool.query(
    `update decks
     set title = $3, updated_at = now()
     where id = $1 and user_id = $2`,
    [deckId, userId, title],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setDeckArchived(
  deckId: string,
  userId: string,
  archived: boolean,
): Promise<boolean> {
  const result = await pool.query(
    `update decks
     set archived_at = case when $3 then coalesce(archived_at, now()) else null end,
         updated_at = now()
     where id = $1 and user_id = $2`,
    [deckId, userId, archived],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setDeckFolderTag(
  deckId: string,
  userId: string,
  folderTag: string | null,
): Promise<boolean> {
  const result = await pool.query(
    `update decks
     set folder_tag = $3, updated_at = now()
     where id = $1 and user_id = $2`,
    [deckId, userId, folderTag],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function duplicateDeck(
  deckId: string,
  userId: string,
): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const source = await client.query<DeckRow>(
      `select * from decks where id = $1 and user_id = $2 for update`,
      [deckId, userId],
    );
    const deck = source.rows[0];
    if (!deck) {
      await client.query("rollback");
      return null;
    }

    const created = await client.query<{ id: string }>(
      `insert into decks (
         user_id, title, source_type, source_content, storage_path,
         source_filename, source_mime_type, source_size_bytes,
         generation_status, generation_provider, generation_model,
         generation_error, share_token, is_shared, visibility,
         subject_tag, moderation_status, moderation_reasons, listed_at,
         is_seed, folder_tag, archived_at
       ) values (
         $1, $2, $3, null, null, null, null, null,
         $4, $5, $6, null, null, false, 'private',
         $7, 'none', null, null, false, $8, null
       )
       returning id`,
      [
        userId,
        `${deck.title} (copy)`,
        deck.source_type,
        deck.generation_status === "complete" ? "complete" : "failed",
        deck.generation_provider,
        deck.generation_model,
        deck.subject_tag,
        deck.folder_tag,
      ],
    );
    const newId = created.rows[0].id;

    await client.query(
      `insert into cards (
         deck_id, front, back, hint, category, card_type, options, image_url, image_attribution, sort_order
       )
       select $2, front, back, hint, category, card_type, options, image_url, image_attribution, sort_order
       from cards
       where deck_id = $1
       order by sort_order, created_at`,
      [deckId, newId],
    );

    await client.query("commit");
    return newId;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createPendingDeck(input: {
  userId: string;
  title: string;
  sourceType: SourceType;
  sourceContent?: string;
  storagePath?: string;
  sourceFilename?: string;
  sourceMimeType?: string;
  sourceSizeBytes?: number;
  provider: LLMProvider;
  model: string;
  sourceRetention?: SourceRetention;
}): Promise<string> {
  const retention = input.sourceRetention ?? "24h";
  const expiresAt =
    retention === "24h"
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;
  const result = await pool.query<{ id: string }>(
    `insert into decks (
      user_id, title, source_type, source_content, storage_path,
      source_filename, source_mime_type, source_size_bytes,
      generation_status, generation_provider, generation_model,
      share_token, is_shared, visibility, source_retention, source_expires_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, 'processing', $9, $10,
      null, false, 'private', $11, $12
    )
    returning id`,
    [
      input.userId,
      input.title,
      input.sourceType,
      input.sourceContent ?? null,
      input.storagePath ?? null,
      input.sourceFilename ?? null,
      input.sourceMimeType ?? null,
      input.sourceSizeBytes ?? null,
      input.provider,
      input.model,
      retention,
      expiresAt,
    ],
  );

  return result.rows[0].id;
}

export async function completeDeckGeneration(
  deckId: string,
  userId: string,
  generatedTitle: string,
  cards: GeneratedFlashcard[],
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const owned = await client.query(
      "select id from decks where id = $1 and user_id = $2 for update",
      [deckId, userId],
    );
    if (!owned.rowCount) throw new Error("Deck not found");

    await client.query("delete from cards where deck_id = $1", [deckId]);
    for (const [index, card] of cards.entries()) {
      await client.query(
        `insert into cards (
          deck_id, front, back, hint, category, sort_order, card_type, options, image_url, image_attribution
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          deckId,
          card.front,
          card.back,
          card.hint ?? null,
          card.category ?? null,
          index,
          card.type ?? "qa",
          card.options ? JSON.stringify(card.options) : null,
          card.imageUrl ?? null,
          card.imageAttribution ? JSON.stringify(card.imageAttribution) : null,
        ],
      );
    }

    await client.query(
      `update decks
       set title = case when title = 'Untitled deck' then $3 else title end,
           generation_status = 'complete', generation_error = null
       where id = $1 and user_id = $2`,
      [deckId, userId, generatedTitle],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

type DiscardedGeneration = {
  id: string;
  userId: string;
  storagePath: string | null;
};

/** Delete a failed/incomplete generation so it never stays in the user's library. */
export async function failDeckGeneration(
  deckId: string,
  userId: string,
  message?: string,
): Promise<DiscardedGeneration | null> {
  void message;
  const result = await pool.query<{ id: string; storage_path: string | null }>(
    `delete from decks
     where id = $1
       and user_id = $2
       and coalesce(is_seed, false) = false
       and generation_status in ('pending', 'processing', 'failed')
     returning id, storage_path`,
    [deckId, userId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { id: row.id, userId, storagePath: row.storage_path };
}

/** Remove leftover failed generations from Supabase and user libraries. */
export async function purgeFailedGenerations(
  userId?: string,
): Promise<DiscardedGeneration[]> {
  const result = await pool.query<{
    id: string;
    user_id: string;
    storage_path: string | null;
  }>(
    `delete from decks
     where generation_status = 'failed'
       and coalesce(is_seed, false) = false
       ${userId ? "and user_id = $1" : ""}
     returning id, user_id, storage_path`,
    userId ? [userId] : [],
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    storagePath: row.storage_path,
  }));
}

/** Apply retention after cards are saved. Returns storage path to delete when cleared. */
export async function clearDeckSource(
  deckId: string,
  userId: string,
): Promise<string | null> {
  const existing = await pool.query<{
    storage_path: string | null;
    source_retention: SourceRetention;
    source_expires_at: Date | null;
  }>(
    `select storage_path, source_retention, source_expires_at
     from decks where id = $1 and user_id = $2`,
    [deckId, userId],
  );
  const row = existing.rows[0];
  if (!row) return null;

  const retention = row.source_retention ?? "24h";
  if (retention === "keep") {
    return null;
  }
  if (
    retention === "24h" &&
    row.source_expires_at &&
    row.source_expires_at.getTime() > Date.now()
  ) {
    return null;
  }

  const storagePath = row.storage_path ?? null;
  await pool.query(
    `update decks
     set source_content = null,
         storage_path = null,
         source_filename = null,
         source_mime_type = null,
         source_size_bytes = null,
         source_expires_at = null
     where id = $1 and user_id = $2`,
    [deckId, userId],
  );

  return storagePath;
}

/** Purge expired 24h retention sources (best-effort). */
export async function purgeExpiredSources(userId?: string): Promise<number> {
  const result = await pool.query<{ storage_path: string | null }>(
    `update decks
     set source_content = null,
         storage_path = null,
         source_filename = null,
         source_mime_type = null,
         source_size_bytes = null,
         source_expires_at = null
     where source_retention = '24h'
       and source_expires_at is not null
       and source_expires_at <= now()
       and (source_content is not null or storage_path is not null)
       ${userId ? "and user_id = $1" : ""}
     returning storage_path`,
    userId ? [userId] : [],
  );
  return result.rowCount ?? 0;
}

export async function transferDecksOwnership(
  fromUserId: string,
  toUserId: string,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const decks = await client.query(
      `update decks set user_id = $2 where user_id = $1`,
      [fromUserId, toUserId],
    );
    await client.query(
      `update study_sessions set user_id = $2 where user_id = $1`,
      [fromUserId, toUserId],
    );
    await client.query(
      `update card_reviews set user_id = $2 where user_id = $1`,
      [fromUserId, toUserId],
    );
    await client.query("commit");
    return decks.rowCount ?? 0;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getDeckWithCards(
  deckId: string,
  userId: string,
): Promise<DeckWithCards | null> {
  const deckResult = await pool.query<DeckRow>(
    "select * from decks where id = $1 and user_id = $2",
    [deckId, userId],
  );
  if (!deckResult.rows[0]) return null;

  const cardResult = await pool.query<CardRow>(
    "select * from cards where deck_id = $1 order by sort_order, created_at",
    [deckId],
  );

  return {
    ...mapDeck(deckResult.rows[0]),
    cards: cardResult.rows.map(mapCard),
  };
}

export async function updateCard(
  cardId: string,
  userId: string,
  input: { front: string; back: string; hint?: string; category?: string },
): Promise<boolean> {
  const result = await pool.query(
    `update cards c
     set front = $3, back = $4, hint = $5, category = $6
     from decks d
     where c.id = $1 and c.deck_id = d.id and d.user_id = $2`,
    [
      cardId,
      userId,
      input.front,
      input.back,
      input.hint ?? null,
      input.category ?? null,
    ],
  );
  return Boolean(result.rowCount);
}

export async function deleteDeck(
  deckId: string,
  userId: string,
): Promise<string | null> {
  const result = await pool.query<{ storage_path: string | null }>(
    "delete from decks where id = $1 and user_id = $2 returning storage_path",
    [deckId, userId],
  );
  return result.rows[0]?.storage_path ?? null;
}
