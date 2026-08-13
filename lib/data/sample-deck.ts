import "server-only";

import { pool } from "@/lib/db";
import type { GeneratedFlashcard } from "@/lib/types/flashcard";

export const SAMPLE_DECK_TITLE = "Sample study deck";

export const SAMPLE_CARDS: GeneratedFlashcard[] = [
  {
    front: "What is a flashcard?",
    back: "A prompt on one side and an answer on the other, used for active recall.",
    hint: "Study tool",
    category: "Basics",
  },
  {
    front: "What does active recall mean?",
    back: "Retrieving an answer from memory instead of only re-reading notes.",
    hint: "Pull, don't just push",
    category: "Learning",
  },
  {
    front: "Why rate cards Hard / OK / Easy?",
    back: "Ratings help you track which ideas need another pass.",
    hint: "Feedback loop",
    category: "HK Study A",
  },
  {
    front: "What does Shuffle do?",
    back: "It randomizes card order so you do not memorize position.",
    hint: "Order",
    category: "HK Study A",
  },
  {
    front: "Who can open a share link?",
    back: "Anyone with the link can study read-only. Signed-in users can save progress.",
    hint: "Permissions",
    category: "Sharing",
  },
  {
    front: "Do sample decks need an LLM key?",
    back: "No. Sample decks use hardcoded cards so you can test without AI credentials.",
    hint: "Prep mode",
    category: "Setup",
  },
  {
    front: "What is spaced practice?",
    back: "Reviewing material across multiple sessions instead of cramming once.",
    hint: "Timing",
    category: "Learning",
  },
  {
    front: "What should you flip the card for?",
    back: "To reveal the answer after attempting to recall it yourself.",
    hint: "Flip",
    category: "Basics",
  },
];

export async function createSampleDeck(userId: string): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const deckResult = await client.query<{ id: string }>(
      `insert into decks (
        user_id, title, source_type, source_content, storage_path,
        source_filename, source_mime_type, source_size_bytes,
        generation_status, generation_provider, generation_model,
        generation_error, share_token, is_shared, visibility
      ) values (
        $1, $2, 'text', $3, null, null, null, null,
        'complete', null, null, null, null, false, 'private'
      )
      returning id`,
      [
        userId,
        SAMPLE_DECK_TITLE,
        "Hardcoded sample material for HK Study A smoke testing.",
      ],
    );
    const deckId = deckResult.rows[0].id;

    for (const [index, card] of SAMPLE_CARDS.entries()) {
      await client.query(
        `insert into cards (
          deck_id, front, back, hint, category, sort_order, card_type
        ) values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          deckId,
          card.front,
          card.back,
          card.hint ?? null,
          card.category ?? null,
          index,
          card.type ?? "qa",
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
