import { describe, expect, it } from "vitest";

import { ENCYCLOPEDIA_FEATURED_PACKS } from "@/lib/data/community-packs/encyclopedia-featured";
import { ENCYCLOPEDIA_GENERAL_PACKS } from "@/lib/data/community-packs/encyclopedia-general";
import { COMMUNITY_SEED_PACKS } from "@/lib/data/community-packs";
import { shortTarget, spellingWord, typedMatches } from "@/lib/play/answers";
import { templateReason, templatesForDeck } from "@/lib/play/eligibility";
import { buildCrossword, buildWordsearch } from "@/lib/play/puzzles";
import { PLAY_TEMPLATE_IDS } from "@/lib/play/templates";
import type { CommunitySeedPack } from "@/lib/data/community-packs/types";
import type { Flashcard } from "@/lib/types/flashcard";

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

  it("unlocks classroom templates on an illustrated encyclopedia pack", () => {
    const list = templatesForDeck(cards);
    expect(list).toHaveLength(PLAY_TEMPLATE_IDS.length);
    expect(templateReason("match-up", cards)).toBeNull();
    expect(templateReason("group-sort", cards)).toBeNull();
    expect(templateReason("image-quiz", cards)).toBeNull();
    expect(templateReason("maze-chase", cards)).toBeNull();
    expect(templateReason("airplane", cards)).toBeNull();
    expect(templateReason("labelled-diagram", cards)).toBeNull();
    expect(templateReason("label-match", cards)).toBeNull();
    expect(templateReason("true-or-false", cards)).toBeNull();
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

  it("gives general packs categories for group sort", () => {
    const matter = ENCYCLOPEDIA_GENERAL_PACKS.find(
      (pack) => pack.slug === "ency-magnets",
    )!;
    const list = asCards(matter);
    expect(templateReason("group-sort", list)).toBeNull();
  });
});
