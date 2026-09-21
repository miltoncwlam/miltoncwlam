import { describe, expect, it } from "vitest";

import {
  examPercent,
  examTrend,
  mergeReviewQueue,
  sparklinePercents,
  type DueCardReview,
  type DueWrongReview,
} from "@/lib/study/review-queue";
import type { Flashcard } from "@/lib/types/flashcard";
import type { WrongQuestionItem } from "@/lib/types/notebook";

function card(id: string, dueAt: Date): DueCardReview {
  return {
    kind: "card",
    dueAt,
    deckId: "deck-a",
    deckTitle: "Biology",
    card: { id, deckId: "deck-a" } as Flashcard,
  };
}

function wrong(id: string, dueAt: Date): DueWrongReview {
  return {
    kind: "wrong",
    dueAt,
    deckId: "deck-b",
    deckTitle: "History",
    item: { id, deckId: "deck-b" } as WrongQuestionItem,
  };
}

describe("mergeReviewQueue", () => {
  it("orders by due date and caps the list", () => {
    const t1 = new Date("2026-09-20T00:00:00Z");
    const t2 = new Date("2026-09-21T00:00:00Z");
    const t3 = new Date("2026-09-22T00:00:00Z");
    const merged = mergeReviewQueue(
      [card("c2", t2), card("c3", t3)],
      [wrong("w1", t1)],
      2,
    );
    expect(merged.map((item) => (item.kind === "card" ? item.card.id : item.item.id))).toEqual([
      "w1",
      "c2",
    ]);
  });

  it("puts a wrong item before a card when due times match", () => {
    const t = new Date("2026-09-21T00:00:00Z");
    const merged = mergeReviewQueue([card("c1", t)], [wrong("w1", t)]);
    expect(merged[0]?.kind).toBe("wrong");
    expect(merged[1]?.kind).toBe("card");
  });
});

describe("exam trend helpers", () => {
  it("computes percents, trend, and a chronological sparkline", () => {
    expect(examPercent(7, 10)).toBe(70);
    expect(examPercent(1, 0)).toBe(0);
    expect(examTrend(80, 60)).toBe("up");
    expect(examTrend(40, 70)).toBe("down");
    expect(examTrend(50, 50)).toBe("same");
    expect(examTrend(90, undefined)).toBe(null);
    expect(
      sparklinePercents(
        [
          { score: 9, maxScore: 10 },
          { score: 6, maxScore: 10 },
          { score: 4, maxScore: 10 },
        ],
        10,
      ),
    ).toEqual([40, 60, 90]);
  });
});
