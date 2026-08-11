import { Pool } from "pg";

import { COMMUNITY_SEED_PACKS } from "../lib/data/community-packs";

const COMMUNITY_SEED_OWNER = "system:study-a-community";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

async function upsertSeedCommunityDeck(
  input: (typeof COMMUNITY_SEED_PACKS)[number],
) {
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

async function main() {
  for (const pack of COMMUNITY_SEED_PACKS) {
    await upsertSeedCommunityDeck(pack);
    const grade = pack.gradeTag ? ` · ${pack.gradeTag}` : "";
    console.log(
      `Seeded ${pack.slug} (${pack.cards.length} cards · ${pack.subjectTag}${grade})`,
    );
  }
  console.log(`Done. ${COMMUNITY_SEED_PACKS.length} community packs.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
