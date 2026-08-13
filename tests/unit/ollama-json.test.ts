import { describe, expect, it } from "vitest";

import {
  extractJsonObject,
  isAcceptableCardCount,
  parseGeneratedDeck,
  UnrelatedSourceError,
} from "@/lib/llm/parse-deck-json";

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
    expect(deck.cards[0].back.length).toBeLessThanOrEqual(280);
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
});
