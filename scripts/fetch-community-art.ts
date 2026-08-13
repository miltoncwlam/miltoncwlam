import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

import { ENCYCLOPEDIA_FEATURED_PACKS } from "../lib/data/community-packs/encyclopedia-featured";
import {
  findLicensedWebImage,
  isAllowedImageMime,
} from "../lib/images/search-licensed-image";
import type { ImageAttribution } from "../lib/images/license";

const COMMUNITY_SEED_OWNER = "system:study-a-community";
const USER_AGENT =
  "StudyA/0.1 (educational flashcards; https://github.com/flashcard-generator)";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

function extFor(contentType: string) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  return "jpg";
}

async function generateKlein(query: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  attribution: ImageAttribution;
} | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux.2-klein-4b",
      prompt: `${query}. Educational illustration for students, simple, colorful, no text.`,
      n: 1,
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    images?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = payload.data?.[0] ?? payload.images?.[0];
  if (item?.b64_json) {
    return {
      bytes: Uint8Array.from(Buffer.from(item.b64_json, "base64")),
      contentType: "image/png",
      attribution: { source: "ai", license: "AI-generated", title: query },
    };
  }
  if (item?.url) {
    const imageResponse = await fetch(item.url, { headers: { "User-Agent": USER_AGENT } });
    if (!imageResponse.ok) return null;
    const contentType = imageResponse.headers.get("content-type") || "image/png";
    return {
      bytes: new Uint8Array(await imageResponse.arrayBuffer()),
      contentType: isAllowedImageMime(contentType) ? contentType : "image/png",
      attribution: { source: "ai", license: "AI-generated", title: query },
    };
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadArt(
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  if (!isAllowedImageMime(contentType)) {
    throw new Error(`unsupported mime ${contentType}`);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "flashcard-media";
  if (!url || !key) throw new Error("Supabase storage is not configured");
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.storage.from(bucket).upload(path, bytes, {
    contentType: contentType.split(";")[0].trim(),
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(signed.error?.message ?? "Could not sign image URL");
  }
  return signed.data.signedUrl;
}

async function main() {
  const cache = new Map<
    string,
    { imageUrl: string; attribution: ImageAttribution }
  >();

  for (const pack of ENCYCLOPEDIA_FEATURED_PACKS) {
    const deck = await pool.query<{ id: string }>(
      `select id from decks
       where user_id = $1 and is_seed = true and source_content = $2`,
      [COMMUNITY_SEED_OWNER, `seed:${pack.slug}`],
    );
    const deckId = deck.rows[0]?.id;
    if (!deckId) {
      console.warn(`Skip ${pack.slug}: seed the pack first`);
      continue;
    }

    await pool.query(`update decks set is_featured = true where id = $1`, [deckId]);

    const existing = await pool.query<{
      sort_order: number;
      image_url: string | null;
      image_attribution: ImageAttribution | null;
    }>(
      `select sort_order, image_url, image_attribution from cards where deck_id = $1`,
      [deckId],
    );
    const existingByOrder = new Map(
      existing.rows.map((row) => [row.sort_order, row]),
    );

    for (const [index, card] of pack.cards.entries()) {
      const artKey = card.artKey;
      const query = card.imageSearchQuery || card.front;
      if (!query) continue;
      const cacheKey = artKey || `${pack.slug}:${index}`;
      const already = existingByOrder.get(index);
      if (already?.image_url && already.image_attribution) {
        cache.set(cacheKey, {
          imageUrl: already.image_url,
          attribution: already.image_attribution,
        });
        continue;
      }
      let resolved = cache.get(cacheKey);
      if (!resolved) {
        let found = await findLicensedWebImage(query);
        if (!found) found = await generateKlein(query);
        if (!found) {
          console.warn(`No image for ${cacheKey} (${query})`);
          continue;
        }
        try {
          const ext = extFor(found.contentType);
          const imageUrl = await uploadArt(
            `${COMMUNITY_SEED_OWNER}/art/${cacheKey}.${ext}`,
            found.bytes,
            found.contentType,
          );
          resolved = { imageUrl, attribution: found.attribution };
        } catch (error) {
          console.warn(
            `Upload failed for ${cacheKey}: ${error instanceof Error ? error.message : error}`,
          );
          if (found.attribution.source !== "ai") {
            const fallback = await generateKlein(query);
            if (fallback) {
              try {
                const imageUrl = await uploadArt(
                  `${COMMUNITY_SEED_OWNER}/art/${cacheKey}.${extFor(fallback.contentType)}`,
                  fallback.bytes,
                  fallback.contentType,
                );
                resolved = { imageUrl, attribution: fallback.attribution };
              } catch (aiError) {
                console.warn(
                  `AI upload failed for ${cacheKey}: ${aiError instanceof Error ? aiError.message : aiError}`,
                );
                continue;
              }
            }
          }
          if (!resolved) continue;
        }
        if (!resolved) continue;
        cache.set(cacheKey, resolved);
        console.log(
          `${resolved.attribution.source}: ${cacheKey} · ${resolved.attribution.license}`,
        );
        await sleep(250);
      }

      await pool.query(
        `update cards
         set image_url = $3, image_attribution = $4::jsonb
         where deck_id = $1 and sort_order = $2`,
        [deckId, index, resolved.imageUrl, JSON.stringify(resolved.attribution)],
      );
    }
    console.log(`Illustrated ${pack.slug}`);
  }

  console.log(`Done. Unique art keys: ${cache.size}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
