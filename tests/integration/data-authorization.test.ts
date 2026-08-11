import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  pool: { query },
}));

import { deleteDeck, getDeckWithCards } from "@/lib/data/decks";

describe("data authorization boundaries", () => {
  beforeEach(() => query.mockReset());

  it("always scopes deck reads to the authenticated user", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await getDeckWithCards("deck-id", "user-id");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("id = $1 and user_id = $2"),
      ["deck-id", "user-id"],
    );
  });

  it("always scopes deletes to the authenticated user", async () => {
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await deleteDeck("deck-id", "user-id");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("id = $1 and user_id = $2"),
      ["deck-id", "user-id"],
    );
  });
});
