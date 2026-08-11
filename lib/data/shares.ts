import "server-only";

import { pool } from "@/lib/db";
import { hashShareToken } from "@/lib/security/share-token";
import { getDeckWithCards } from "@/lib/data/decks";
import type { DeckWithCards } from "@/lib/types/flashcard";

export async function enableDeckSharing(
  deckId: string,
  userId: string,
  token: string,
): Promise<boolean> {
  const result = await pool.query(
    `update decks
     set is_shared = true,
         share_token_hash = $3,
         share_token = null,
         visibility = case when visibility = 'public' then 'public' else 'unlisted' end
     where id = $1 and user_id = $2`,
    [deckId, userId, hashShareToken(token)],
  );
  return Boolean(result.rowCount);
}

export async function disableDeckSharing(
  deckId: string,
  userId: string,
): Promise<boolean> {
  const result = await pool.query(
    `update decks
     set is_shared = false,
         share_token_hash = null,
         share_token = null,
         visibility = 'private',
         moderation_status = 'none',
         moderation_reasons = null,
         listed_at = null
     where id = $1 and user_id = $2`,
    [deckId, userId],
  );
  return Boolean(result.rowCount);
}

export async function getSharedDeck(
  token: string,
): Promise<DeckWithCards | null> {
  const deckResult = await pool.query<{ id: string; user_id: string }>(
    `select id, user_id from decks
     where share_token_hash = $1
       and visibility in ('unlisted', 'public')`,
    [hashShareToken(token)],
  );
  const deck = deckResult.rows[0];
  return deck ? getDeckWithCards(deck.id, deck.user_id) : null;
}
