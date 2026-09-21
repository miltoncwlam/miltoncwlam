import { describe, expect, it } from "vitest";

import { clampStars, ratingAverage } from "@/lib/community/ratings";
import {
  COMMUNITY_SEED_DISPLAY_NAME,
  communityCopyPatch,
  communityCreatorName,
  nextCopyCount,
} from "@/lib/community/copies";

describe("community ratings", () => {
  it("clamps stars to 1–5", () => {
    expect(clampStars(0)).toBe(1);
    expect(clampStars(3.4)).toBe(3);
    expect(clampStars(3.6)).toBe(4);
    expect(clampStars(9)).toBe(5);
    expect(clampStars(Number.NaN)).toBe(1);
  });

  it("averages to one decimal", () => {
    expect(ratingAverage([])).toEqual({ avg: 0, count: 0 });
    expect(ratingAverage([5, 4, 5])).toEqual({ avg: 4.7, count: 3 });
    expect(ratingAverage([1, 1, 1, 5])).toEqual({ avg: 2, count: 4 });
  });
});

describe("community copies", () => {
  it("tracks the source only on community copy", () => {
    expect(communityCopyPatch(true, "deck-1")).toEqual({
      copiedFromDeckId: "deck-1",
      incrementCopyCount: true,
    });
    expect(communityCopyPatch(false, "deck-1")).toEqual({
      copiedFromDeckId: null,
      incrementCopyCount: false,
    });
  });

  it("increments copy count from zero", () => {
    expect(nextCopyCount(0)).toBe(1);
    expect(nextCopyCount(11)).toBe(12);
    expect(nextCopyCount(-2)).toBe(1);
  });

  it("names the seed owner HK Study A", () => {
    const names = new Map([["user_abc", "Ada"]]);
    expect(communityCreatorName("system:study-a-community", names)).toBe(
      COMMUNITY_SEED_DISPLAY_NAME,
    );
    expect(communityCreatorName("user_abc", names)).toBe("Ada");
    expect(communityCreatorName("user_missing", names)).toBe("Learner");
  });
});
