import { describe, expect, it } from "vitest";

import { ENCYCLOPEDIA_FEATURED_PACKS } from "@/lib/data/community-packs/encyclopedia-featured";
import { ENCYCLOPEDIA_GENERAL_PACKS } from "@/lib/data/community-packs/encyclopedia-general";
import { COMMUNITY_SEED_PACKS } from "@/lib/data/community-packs";
import { playChip, shortTarget, typedMatches } from "@/lib/play/answers";
import {
  catalogReason,
  templateReason,
  unlockedCatalogCount,
} from "@/lib/play/eligibility";
import { PLAY_CATALOG_IDS, PLAY_TEMPLATES, PLAY_TEMPLATE_IDS, resolvePlayTemplate } from "@/lib/play/templates";
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

function chipDeck(count = 10): Flashcard[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `chip-${index}`,
    deckId: "11111111-1111-4111-8111-111111111111",
    front: `What is term ${index}?`,
    back: `Term${index}`,
    hint: "A leftover explanation that belongs in WhyBox, not on a sprite.",
    category: index % 2 === 0 ? "Even" : "Odd",
    cardType: "qa" as const,
    options: null,
    imageUrl: null,
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

  it("ships a 15-game catalog and keeps retired ids for old runs", () => {
    expect(PLAY_TEMPLATES).toHaveLength(15);
    expect(PLAY_CATALOG_IDS).toHaveLength(15);
    expect(PLAY_TEMPLATE_IDS.length).toBeGreaterThan(15);
    expect(resolvePlayTemplate("crossword")).toBe("type-the-answer");
    expect(resolvePlayTemplate("airplane")).toBe("gate-dash");
    expect(resolvePlayTemplate("speaking-cards")).toBe("study");
    expect(resolvePlayTemplate("match-up")).toBe("matching-pairs");
  });

  it("unlocks at least 10 of 15 on a 10-card chip-only deck", () => {
    const deck = chipDeck(10);
    expect(unlockedCatalogCount(deck)).toBeGreaterThanOrEqual(10);
    expect(catalogReason("matching-pairs", deck)).toBeNull();
    expect(catalogReason("gate-dash", deck)).toBeNull();
    expect(catalogReason("group-sort", deck)).toBeNull();
    expect(templateReason("airplane", deck)).toBeNull();
  });

  it("types a short encyclopedia answer when one exists", () => {
    const card = cards.find((item) => /Mars/.test(item.back) || /Mars/.test(item.front));
    expect(card).toBeTruthy();
    if (!card) return;
    const target = shortTarget(card);
    if (!target) {
      expect(playChip(card)).toBeNull();
      return;
    }
    expect(typedMatches(target, card)).toBe(true);
  });

  it("gives general packs categories for homework trays", () => {
    const matter = ENCYCLOPEDIA_GENERAL_PACKS.find(
      (pack) => pack.slug === "ency-magnets",
    )!;
    const list = asCards(matter);
    expect(templateReason("group-sort", list)).toBeNull();
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
    for (const id of PLAY_CATALOG_IDS) {
      expect(en.play.templates[id].howTo.length).toBeGreaterThan(0);
    }
  });
});
