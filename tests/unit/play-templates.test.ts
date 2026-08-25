import { describe, expect, it } from "vitest";

import { ENCYCLOPEDIA_FEATURED_PACKS } from "@/lib/data/community-packs/encyclopedia-featured";
import { ENCYCLOPEDIA_GENERAL_PACKS } from "@/lib/data/community-packs/encyclopedia-general";
import { COMMUNITY_SEED_PACKS } from "@/lib/data/community-packs";
import { shortTarget, spellingWord, typedMatches } from "@/lib/play/answers";
import { templateReason, templatesForDeck } from "@/lib/play/eligibility";
import { buildCrossword, buildWordsearch } from "@/lib/play/puzzles";
import { PLAY_CATALOG_IDS, PLAY_TEMPLATE_IDS } from "@/lib/play/templates";
import type { CommunitySeedPack } from "@/lib/data/community-packs/types";
import type { Flashcard } from "@/lib/types/flashcard";

import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import zhHans from "../../messages/zh-Hans.json";
import zhHant from "../../messages/zh-Hant.json";

function asCards(pack: CommunitySeedPack, withImages = false): Flashcard[] {
  return pack.cards.map((card, index) => ({
    id: `${pack.slug}-${index}`,
    deckId: pack.slug,
    front: card.front,
    back: card.back,
    hint: card.hint ?? null,
    category: card.category ?? null,
    cardType: card.type ?? "qa",
    options: card.options ?? null,
    imageUrl: withImages ? `https://example.com/${card.artKey ?? index}.jpg` : null,
    imageAttribution: null,
    sortOrder: index,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

describe("play templates", () => {
  const solar = ENCYCLOPEDIA_FEATURED_PACKS.find((pack) =>
    pack.slug === "ency-solar-primary",
  )!;
  const cards = asCards(solar, true);

  it("keeps unique community slugs", () => {
    const slugs = COMMUNITY_SEED_PACKS.map((pack) => pack.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("unlocks the two core play activities on an illustrated encyclopedia pack", () => {
    const list = templatesForDeck(cards);
    expect(list).toHaveLength(PLAY_CATALOG_IDS.length);
    expect(templateReason("matching-pairs", cards)).toBeNull();
    expect(templateReason("type-the-answer", cards)).toBeNull();
    expect(templateReason("match-up", cards)).toBeNull();
    expect(templateReason("hangman", cards)).toBeNull();
  });

  it("types a short encyclopedia answer", () => {
    const card = cards.find((item) => /Mars/.test(item.back) || /Mars/.test(item.front));
    expect(card).toBeTruthy();
    if (!card) return;
    const target = shortTarget(card);
    expect(target).toBeTruthy();
    expect(typedMatches(target!, card)).toBe(true);
  });

  it("builds crossword and wordsearch from short answers when possible", () => {
    const spellable = cards.filter((card) => spellingWord(card));
    if (spellable.length >= 4) {
      expect(buildWordsearch(spellable)).toBeTruthy();
    }
    const puzzle = buildCrossword(cards);
    if (puzzle) {
      expect(puzzle.entries.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("gives general packs enough cards for matching pairs", () => {
    const matter = ENCYCLOPEDIA_GENERAL_PACKS.find(
      (pack) => pack.slug === "ency-magnets",
    )!;
    const list = asCards(matter);
    expect(templateReason("matching-pairs", list)).toBeNull();
  });
});

function messageKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale catalogs", () => {
  it("keeps the same keys in every locale file", () => {
    const expected = messageKeys(en).sort();
    for (const catalog of [es, fr, ja, ko, zhHans, zhHant]) {
      expect(messageKeys(catalog).sort()).toEqual(expected);
    }
  });

  it("names every play template", () => {
    for (const id of PLAY_TEMPLATE_IDS) {
      expect(en.play.templates[id].name.length).toBeGreaterThan(0);
      expect(en.play.templates[id].blurb.length).toBeGreaterThan(0);
    }
  });
});
