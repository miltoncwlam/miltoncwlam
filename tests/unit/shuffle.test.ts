import { describe, expect, it } from "vitest";

import { shuffleIds } from "@/lib/study/shuffle";

describe("shuffleIds", () => {
  it("returns a shuffled copy without mutating the input", () => {
    const original = ["a", "b", "c"];
    const shuffled = shuffleIds(original, () => 0);

    expect(shuffled).toEqual(["b", "c", "a"]);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("preserves every card exactly once", () => {
    const original = ["a", "b", "c", "d"];
    expect(shuffleIds(original).sort()).toEqual(original);
  });
});
