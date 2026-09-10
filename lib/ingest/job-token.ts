import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export function ingestJobToken(deckId: string) {
  return createHmac("sha256", env.CLERK_SECRET_KEY).update(deckId).digest("hex");
}

export function ingestJobTokenOk(deckId: string, token: string | null) {
  if (!token) return false;
  const expected = ingestJobToken(deckId);
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
