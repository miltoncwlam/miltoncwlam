import { describe, expect, it } from "vitest";

import {
  PLAY_STAKE,
  PLAY_STAKE_LIMIT_HOUR,
  assertPlayScore,
  playNet,
  playPayout,
} from "@/lib/credits/play";

describe("play energy pot", () => {
  it("charges a stake and pays nothing below 50%", () => {
    expect(PLAY_STAKE).toBe(20);
    expect(playPayout(4, 12)).toBe(0);
    expect(playNet(4, 12)).toBe(-20);
  });

  it("returns the stake at 50%+ and doubles on a perfect run", () => {
    expect(playPayout(6, 12)).toBe(20);
    expect(playPayout(10, 12)).toBe(30);
    expect(playPayout(12, 12)).toBe(40);
    expect(playNet(12, 12)).toBe(20);
  });

  it("rejects impossible client scores", () => {
    expect(() =>
      assertPlayScore({ score: 9, maxScore: 8, cardCount: 8 }),
    ).toThrow(/Invalid score/);
    expect(() =>
      assertPlayScore({ score: 8, maxScore: 8, cardCount: 8 }),
    ).not.toThrow();
    expect(() =>
      assertPlayScore({ score: 0, maxScore: 0, cardCount: 8 }),
    ).toThrow(/Invalid score/);
    expect(() =>
      assertPlayScore({ score: 0, maxScore: 3001, cardCount: 8 }),
    ).toThrow(/Invalid score/);
    expect(() =>
      assertPlayScore({ score: 2400, maxScore: 2400, cardCount: 8 }),
    ).not.toThrow();
  });

  it("caps paid play rounds per hour", () => {
    expect(PLAY_STAKE_LIMIT_HOUR).toBe(10);
  });
});
