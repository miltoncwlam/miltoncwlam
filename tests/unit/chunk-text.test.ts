import { describe, expect, it } from "vitest";

import {
  allocateCardCounts,
  chunkStudyText,
  shouldChunkText,
} from "@/lib/ingest/chunk-text";
import { mergeGeneratedDecks } from "@/lib/llm/merge-decks";

describe("chunkStudyText", () => {
  it("does not require chunking for short text", () => {
    expect(shouldChunkText("short notes")).toBe(false);
  });

  it("splits long text into overlapping parts and allocates cards", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ${"word ".repeat(80)}`).join(
      "\n\n",
    );
    expect(shouldChunkText(text)).toBe(true);
    const chunks = chunkStudyText(text, 10);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.reduce((sum, chunk) => sum + chunk.cardCount, 0)).toBe(10);
  });

  it("respects maxChunks for local Ollama bounds", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ${"word ".repeat(80)}`).join(
      "\n\n",
    );
    const chunks = chunkStudyText(text, 10, { maxChunks: 2 });
    expect(chunks.length).toBeLessThanOrEqual(2);
    expect(chunks.reduce((sum, chunk) => sum + chunk.cardCount, 0)).toBe(10);
  });

  it("prefers chapter headings when present", () => {
    const text = [
      "Chapter 1 Intro",
      "a ".repeat(400),
      "Chapter 2 Details",
      "b ".repeat(400),
      "Chapter 3 Summary",
      "c ".repeat(400),
    ].join("\n");
    const chunks = chunkStudyText(text, 9);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].label.toLowerCase()).toContain("chapter");
  });
});

describe("allocateCardCounts", () => {
  it("sums to the requested total", () => {
    expect(allocateCardCounts(3, 10).reduce((a, b) => a + b, 0)).toBe(10);
    expect(allocateCardCounts(1, 5)).toEqual([5]);
  });
});

describe("mergeGeneratedDecks", () => {
  it("dedupes similar fronts and trims to target", () => {
    const merged = mergeGeneratedDecks(
      [
        {
          title: "Deck A",
          cards: [
            { front: "What is osmosis?", back: "Water diffusion", type: "qa" },
            { front: "What is diffusion?", back: "Particle spread", type: "qa" },
          ],
        },
        {
          title: "Deck B",
          cards: [
            { front: "what is osmosis?", back: "Duplicate", type: "qa" },
            { front: "What is a cell?", back: "Basic unit of life", type: "qa" },
          ],
        },
      ],
      3,
    );
    expect(merged.title).toBe("Deck A");
    expect(merged.cards).toHaveLength(3);
  });
});
