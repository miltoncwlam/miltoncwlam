import { describe, expect, it } from "vitest";

import { applySm2, defaultSrsState } from "@/lib/study/sm2";

describe("applySm2", () => {
  it("resets on hard", () => {
    const now = new Date("2026-08-11T00:00:00Z");
    const next = applySm2(
      { ...defaultSrsState(now), repetitions: 3, intervalDays: 10, easeFactor: 2.5 },
      "hard",
      now,
    );
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBe(1);
  });

  it("grows interval on easy", () => {
    const now = new Date("2026-08-11T00:00:00Z");
    let state = defaultSrsState(now);
    state = applySm2(state, "easy", now);
    expect(state.intervalDays).toBe(1);
    state = applySm2(state, "easy", now);
    expect(state.intervalDays).toBe(6);
    state = applySm2(state, "easy", now);
    expect(state.intervalDays).toBeGreaterThan(6);
  });
});
