import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Reusable learner code. Keep out of client bundles. */
export const ENERGY_GIFT_CODE = "30624700";

export function giftCodeMatches(input: string): boolean {
  const given = Buffer.from(input.trim(), "utf8");
  const expected = Buffer.from(ENERGY_GIFT_CODE, "utf8");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}
