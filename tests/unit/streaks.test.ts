import { describe, expect, it } from "vitest";

import { hongKongDate, nextStreak, visibleStreak } from "@/lib/streaks";

describe("Hong Kong streak math", () => {
  it("starts, continues, and resets daily streaks", () => {
    const first = nextStreak(
      { currentCount: 0, longestCount: 0, lastHkDate: null },
      "2026-08-16",
    );
    expect(first).toMatchObject({ currentCount: 1, longestCount: 1 });
    expect(
      nextStreak({ ...first, lastHkDate: "2026-08-16" }, "2026-08-17"),
    ).toMatchObject({ currentCount: 2, longestCount: 2 });
    expect(
      nextStreak({ currentCount: 5, longestCount: 5, lastHkDate: "2026-08-14" }, "2026-08-16"),
    ).toMatchObject({ currentCount: 1, longestCount: 5 });
  });

  it("uses the Hong Kong calendar date", () => {
    expect(hongKongDate(new Date("2026-08-16T16:00:00Z"))).toBe("2026-08-17");
    expect(
      visibleStreak(
        { currentCount: 3, longestCount: 4, lastHkDate: "2026-08-16" },
        "2026-08-17",
      ),
    ).toMatchObject({ current: 3, activeToday: false });
  });
});
