import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  pool: { query },
}));

import { GuestQuotaError } from "@/lib/credits/config";
import {
  assertGuestGenerateQuota,
  countGuestGeneratesUsed,
  GUEST_GENERATE_REASONS,
} from "@/lib/data/credits";

describe("guest generate quota", () => {
  beforeEach(() => query.mockReset());

  it("subtracts refunds so a failed generate does not burn the trial", async () => {
    query.mockResolvedValueOnce({ rows: [{ used: "0" }] });
    await expect(countGuestGeneratesUsed("guest-1")).resolves.toBe(0);
    expect(query.mock.calls[0]?.[0]).toMatch(/generate_refund/);
    expect(query.mock.calls[0]?.[1]?.[1]).toEqual([...GUEST_GENERATE_REASONS]);
    expect(GUEST_GENERATE_REASONS).toContain("generate_notes");
    expect(GUEST_GENERATE_REASONS).toContain("generate_cards");
    expect(GUEST_GENERATE_REASONS).toContain("generate_ingest");
    expect(GUEST_GENERATE_REASONS).not.toContain("generate_chat");
  });

  it("blocks guests only after net generates hit the limit", async () => {
    query.mockResolvedValueOnce({ rows: [{ used: "2" }] });
    await expect(assertGuestGenerateQuota("guest-1", true)).rejects.toBeInstanceOf(
      GuestQuotaError,
    );
  });

  it("skips signed-in users", async () => {
    await expect(assertGuestGenerateQuota("user-1", false)).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });
});
