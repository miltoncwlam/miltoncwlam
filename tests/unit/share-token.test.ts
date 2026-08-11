import { describe, expect, it } from "vitest";

import {
  createShareToken,
  hashShareToken,
} from "@/lib/security/share-token";

describe("share tokens", () => {
  it("creates high-entropy URL-safe tokens", () => {
    const first = createShareToken();
    const second = createShareToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(second).not.toBe(first);
  });

  it("hashes deterministically without retaining the token", () => {
    const token = "private-token";
    const hash = hashShareToken(token);

    expect(hash).toHaveLength(64);
    expect(hashShareToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });
});
