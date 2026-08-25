import { describe, expect, it } from "vitest";

import { hongKongDate, nextStreak, visibleStreak } from "@/lib/streaks";

describe("Hong Kong streak math", () => {
  it("starts at 1 on a first qualifying day", () => {
    const next = nextStreak(
      { currentCount: 0, longestCount: 0, lastHkDate: null },
      "2026-08-16",
    );
    expect(next).toEqual({
      currentCount: 1,
      longestCount: 1,
      lastHkDate: "2026-08-16",
    });
  });

  it("does not increment twice on the same day", () => {
    const record = {
      currentCount: 4,
      longestCount: 6,
      lastHkDate: "2026-08-16",
    };
    expect(nextStreak(record, "2026-08-16")).toEqual(record);
  });

  it("continues when the last day was yesterday", () => {
    const next = nextStreak(
      { currentCount: 4, longestCount: 6, lastHkDate: "2026-08-15" },
      "2026-08-16",
    );
    expect(next.currentCount).toBe(5);
    expect(next.longestCount).toBe(6);
    expect(next.lastHkDate).toBe("2026-08-16");
  });

  it("grows longest when the new current passes it", () => {
    const next = nextStreak(
      { currentCount: 6, longestCount: 6, lastHkDate: "2026-08-15" },
      "2026-08-16",
    );
    expect(next.currentCount).toBe(7);
    expect(next.longestCount).toBe(7);
  });

  it("resets to 1 after a gap", () => {
    const next = nextStreak(
      { currentCount: 12, longestCount: 20, lastHkDate: "2026-08-14" },
      "2026-08-16",
    );
    expect(next.currentCount).toBe(1);
    expect(next.longestCount).toBe(20);
    expect(next.lastHkDate).toBe("2026-08-16");
  });

  it("still shows the current streak until the Hong Kong day is missed", () => {
    const record = {
      currentCount: 3,
      longestCount: 9,
      lastHkDate: "2026-08-15",
    };
    expect(visibleStreak(record, "2026-08-16")).toEqual({
      current: 3,
      longest: 9,
      activeToday: false,
    });
    expect(visibleStreak(record, "2026-08-17").current).toBe(0);
    expect(visibleStreak(record, "2026-08-15").activeToday).toBe(true);
  });

  it("uses Asia/Hong_Kong, not UTC, for the calendar date", () => {
    const beforeMidnight = new Date("2026-08-16T15:59:00Z");
    const afterMidnight = new Date("2026-08-16T16:00:00Z");
    expect(hongKongDate(beforeMidnight)).toBe("2026-08-16");
    expect(hongKongDate(afterMidnight)).toBe("2026-08-17");
  });
});
