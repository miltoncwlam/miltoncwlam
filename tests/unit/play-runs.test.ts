import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

const credits = vi.hoisted(() => ({
  assertAndSpendCredits: vi.fn(),
  refundCredits: vi.fn(),
  getOrRefreshCredits: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  pool: { query },
}));

vi.mock("@/lib/data/credits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/credits")>();
  return {
    ...actual,
    assertAndSpendCredits: credits.assertAndSpendCredits,
    refundCredits: credits.refundCredits,
    getOrRefreshCredits: credits.getOrRefreshCredits,
  };
});

vi.mock("@/lib/data/streaks", () => ({
  rememberStreak: vi.fn(async () => undefined),
  touchStreak: vi.fn(async () => undefined),
  getStreak: vi.fn(async () => ({ current: 0, longest: 0, activeToday: false })),
}));

import { PLAY_STAKE_LIMIT_HOUR } from "@/lib/credits/play";
import { completeGameRun, listClassRunsForDeck, startGameRun } from "@/lib/data/games";

const openRow = {
  id: "run-1",
  deck_id: "11111111-1111-4111-8111-111111111111",
  template: "match-up",
  score: 0,
  max_score: 0,
  payload: { clientKey: "key-1", stake: 20, payout: 0 },
  completed_at: null,
};

const doneRow = {
  ...openRow,
  score: 8,
  max_score: 8,
  payload: { clientKey: "key-1", stake: 20, payout: 40 },
  completed_at: new Date("2026-01-01T00:00:00Z"),
};

describe("play run economy", () => {
  beforeEach(() => {
    query.mockReset();
    credits.assertAndSpendCredits.mockReset();
    credits.refundCredits.mockReset();
    credits.getOrRefreshCredits.mockReset();
    credits.getOrRefreshCredits.mockResolvedValue({ isUnlimited: false });
    credits.assertAndSpendCredits.mockResolvedValue({});
    credits.refundCredits.mockResolvedValue({});
  });

  it("does not spend twice for the same client key", async () => {
    query.mockResolvedValueOnce({ rows: [openRow] });

    const run = await startGameRun({
      deckId: openRow.deck_id,
      userId: "user-1",
      template: "match-up",
      clientKey: "key-1",
    });

    expect(run.stake).toBe(20);
    expect(credits.assertAndSpendCredits).not.toHaveBeenCalled();
  });

  it("rate-limits new antes after N play_stake ledger rows", async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: String(PLAY_STAKE_LIMIT_HOUR) }] });

    await expect(
      startGameRun({
        deckId: openRow.deck_id,
        userId: "user-1",
        template: "match-up",
        clientKey: "key-new",
      }),
    ).rejects.toThrow(/Too many play rounds this hour/);
    expect(credits.assertAndSpendCredits).not.toHaveBeenCalled();
    expect(query.mock.calls[1]?.[0]).toMatch(/reason = 'play_stake'/);
  });

  it("treats a second complete as a no-op", async () => {
    query.mockResolvedValueOnce({ rows: [doneRow] });

    const run = await completeGameRun({
      deckId: doneRow.deck_id,
      userId: "user-1",
      template: "match-up",
      score: 8,
      maxScore: 8,
      cardCount: 8,
      clientKey: "key-1",
    });

    expect(run.payout).toBe(40);
    expect(credits.refundCredits).not.toHaveBeenCalled();
  });

  it("rejects a score above maxScore before paying out", async () => {
    query.mockResolvedValueOnce({ rows: [openRow] });

    await expect(
      completeGameRun({
        deckId: openRow.deck_id,
        userId: "user-1",
        template: "match-up",
        score: 99,
        maxScore: 8,
        cardCount: 8,
        clientKey: "key-1",
      }),
    ).rejects.toThrow(/Invalid score/);
    expect(credits.refundCredits).not.toHaveBeenCalled();
  });

  it("tags a new run with the class link id", async () => {
    const classLinkId = "33333333-3333-4333-8333-333333333333";
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            ...openRow,
            payload: { ...openRow.payload, classLinkId },
          },
        ],
      });

    const run = await startGameRun({
      deckId: openRow.deck_id,
      userId: "user-1",
      template: "match-up",
      clientKey: "key-new",
      classLinkId,
    });

    expect(run.classLinkId).toBe(classLinkId);
    const inserted = JSON.parse(String(query.mock.calls[2]?.[1]?.[3]));
    expect(inserted.classLinkId).toBe(classLinkId);
  });

  it("lists completed runs tagged to the teacher class links", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "run-2",
          user_id: "student-1",
          template: "match-up",
          score: 6,
          max_score: 8,
          payload: { stake: 20, payout: 20, classLinkId: "link-1" },
          completed_at: doneRow.completed_at,
          class_link_id: "link-1",
        },
      ],
    });

    const runs = await listClassRunsForDeck(openRow.deck_id, "teacher-1");
    expect(runs).toHaveLength(1);
    expect(runs[0]?.score).toBe(6);
    expect(query.mock.calls[0]?.[0]).toMatch(/payload->>'classLinkId'/);
    expect(query.mock.calls[0]?.[1]).toEqual([openRow.deck_id, "teacher-1"]);
  });
});
