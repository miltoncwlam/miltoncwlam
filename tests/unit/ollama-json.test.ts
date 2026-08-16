import { describe, expect, it } from "vitest";

import {
  assertEnoughCards,
  extractJsonObject,
  isAcceptableCardCount,
  needsChipRewrite,
  parseGeneratedDeck,
  UnrelatedSourceError,
} from "@/lib/llm/parse-deck-json";
import { mergeGeneratedDecks } from "@/lib/llm/merge-decks";

describe("JSON deck parsing", () => {
  it("parses raw JSON", () => {
    const deck = parseGeneratedDeck(
      extractJsonObject(
        JSON.stringify({
          title: "Cells",
          cards: [
            { front: "Q1", back: "A1" },
            { front: "Q2", back: "A2" },
            { front: "Q3", back: "A3" },
          ],
        }),
      ),
    );
    expect(deck.title).toBe("Cells");
    expect(deck.cards).toHaveLength(3);
    expect(deck.cards[0].type).toBe("qa");
  });

  it("extracts JSON from fenced markdown and surrounding prose", () => {
    const text = `Sure! Here you go:
\`\`\`json
{"title":"History","cards":[{"front":"Q1","back":"A1"},{"front":"Q2","back":"A2"},{"front":"Q3","back":"A3"}]}
\`\`\`
Hope that helps.`;
    const deck = parseGeneratedDeck(extractJsonObject(text));
    expect(deck.title).toBe("History");
  });

  it("rejects too few cards", () => {
    expect(() =>
      parseGeneratedDeck({
        title: "Tiny",
        cards: [{ front: "Q1", back: "A1" }],
      }),
    ).toThrow();
  });

  it("enforces expected card count and trims extras", () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({
      front: `Q${i + 1}`,
      back: `A${i + 1}`,
    }));
    expect(() =>
      parseGeneratedDeck(
        { title: "Short", cards: cards.slice(0, 3) },
        { expectedCardCount: 5 },
      ),
    ).toThrow(/5 were requested|expected array to have >=5 items/);

    const trimmed = parseGeneratedDeck(
      { title: "Long", cards },
      { expectedCardCount: 3 },
    );
    expect(trimmed.cards).toHaveLength(3);
  });

  it("truncates overly long fronts and backs", () => {
    const deck = parseGeneratedDeck({
      title: "Long",
      cards: [
        { front: "F".repeat(300), back: "B".repeat(400) },
        { front: "Q2", back: "A2" },
        { front: "Q3", back: "A3" },
      ],
    });
    expect(deck.cards[0].front.length).toBeLessThanOrEqual(160);
    expect(deck.cards[0].back.length).toBeLessThanOrEqual(40);
    expect(deck.cards[0].hint?.length).toBeGreaterThan(0);
  });

  it("rejects unrelated sources", () => {
    expect(() =>
      parseGeneratedDeck({
        error: "UNRELATED_SOURCE",
        message: "This is a grocery list, not study notes.",
      }),
    ).toThrow(UnrelatedSourceError);
  });

  it("soft-accepts near card counts for local models", () => {
    expect(isAcceptableCardCount(8, 10)).toBe(true);
    expect(isAcceptableCardCount(2, 10)).toBe(false);
    const deck = parseGeneratedDeck(
      {
        title: "Near",
        cards: Array.from({ length: 8 }, (_, i) => ({
          front: `Q${i + 1}`,
          back: `A${i + 1}`,
        })),
      },
      { expectedCardCount: 10, softCount: true },
    );
    expect(deck.cards).toHaveLength(8);
  });

  it("rejects insufficient content separately from unrelated", () => {
    try {
      parseGeneratedDeck({
        error: "INSUFFICIENT_CONTENT",
        message: "Only two facts in these notes.",
      });
      throw new Error("expected refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(UnrelatedSourceError);
      expect((error as UnrelatedSourceError).code).toBe("INSUFFICIENT_CONTENT");
    }
  });

  it("parses a short refill batch and merges without dropping leftover cards", () => {
    const first = parseGeneratedDeck(
      {
        title: "Cells",
        cards: Array.from({ length: 8 }, (_, i) => ({
          front: `What is term ${i}?`,
          back: `Term${i}`,
        })),
      },
      { expectedCardCount: 10, softCount: true },
    );
    const extra = parseGeneratedDeck(
      {
        title: "Cells",
        cards: [
          { front: "What is term 3?", back: "Duplicate" },
          { front: "What is term 8?", back: "Term8" },
          { front: "What is term 9?", back: "Term9" },
        ],
      },
      { expectedCardCount: 2, softCount: true, allowPartial: true },
    );
    const merged = mergeGeneratedDecks([first, extra], 10, first.title);
    const kept = assertEnoughCards(merged, 10);
    expect(kept.cards).toHaveLength(10);
    expect(kept.requestedCardCount).toBe(10);
    expect(kept.cards.map((card) => card.back)).toContain("Term9");
  });

  it("refuses a 3-of-10 collapse after refill", () => {
    const tiny = parseGeneratedDeck({
      title: "Thin",
      cards: [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
        { front: "Q3", back: "A3" },
      ],
    });
    expect(() => assertEnoughCards(tiny, 10)).toThrow(UnrelatedSourceError);
    try {
      assertEnoughCards(tiny, 10);
    } catch (error) {
      expect((error as UnrelatedSourceError).code).toBe("INSUFFICIENT_CONTENT");
    }
  });

  it("flags a long back for a chip rewrite", () => {
    expect(needsChipRewrite({ back: "Mars" })).toBe(false);
    expect(
      needsChipRewrite({
        back: "A very long paragraph that must not sit on a sprite",
      }),
    ).toBe(true);
  });
});
