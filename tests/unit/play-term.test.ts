import { describe, expect, it } from "vitest";

import { playChip } from "@/lib/play/answers";
import { splitPlayTerm, tightenForChip } from "@/lib/play/term";
import type { Flashcard } from "@/lib/types/flashcard";

describe("splitPlayTerm", () => {
  it("keeps a short back and leaves the hint", () => {
    const result = splitPlayTerm("Mars", "The red planet.");
    expect(result.back).toBe("Mars");
    expect(result.hint).toBe("The red planet.");
  });

  it("moves leftover essay into hint and never drops it", () => {
    const essay =
      "Photosynthesis is how plants make food. They use sunlight, water, and carbon dioxide.";
    const result = splitPlayTerm(essay);
    expect(result.back.split(/\s+/).length).toBeLessThanOrEqual(6);
    expect(result.back.length).toBeLessThanOrEqual(40);
    expect(result.hint).toContain("sunlight");
    expect(`${result.back} ${result.hint}`.replace(/\s+/g, " ")).toContain(
      "carbon dioxide",
    );
  });

  it("keeps a short CJK term on a chip", () => {
    const result = tightenForChip("光合作用是植物制造养分的过程");
    expect(result.back.length).toBeLessThanOrEqual(4);
    expect(result.hint).toContain("植物");
  });
});

describe("playChip", () => {
  it("never returns more than 22 characters", () => {
    const card = {
      id: "1",
      deckId: "d",
      front: "What is this?",
      back: "A very long paragraph that must not be sliced onto a sprite.",
      hint: null,
      category: null,
      cardType: "qa",
      options: null,
      imageUrl: null,
      imageAttribution: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Flashcard;
    expect(playChip(card)).toBeNull();
  });

  it("returns a short term", () => {
    const card = {
      id: "1",
      deckId: "d",
      front: "Red planet?",
      back: "Mars",
      hint: "Iron oxide.",
      category: "Planets",
      cardType: "qa",
      options: null,
      imageUrl: null,
      imageAttribution: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Flashcard;
    expect(playChip(card)).toBe("Mars");
  });
});

describe("tightenForChip", () => {
  it("shortens a 40-character term so a sprite can use it", () => {
    const result = tightenForChip("Saturn ice rock ring pieces");
    expect(result.back.length).toBeLessThanOrEqual(22);
    expect(result.hint).toBeTruthy();
  });
});
