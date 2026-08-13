"use server";

import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { saveGameRun } from "@/lib/data/games";
import { PLAY_TEMPLATE_IDS } from "@/lib/play/templates";

const completeSchema = z.object({
  deckId: z.string().uuid(),
  template: z.enum(PLAY_TEMPLATE_IDS),
  score: z.number().int().min(0).max(10000),
  maxScore: z.number().int().min(0).max(10000),
});

export async function completeGameRunAction(input: {
  deckId: string;
  template: string;
  score: number;
  maxScore: number;
}) {
  const session = await requireSession();
  const parsed = completeSchema.parse(input);
  const deck = await getDeckWithCards(parsed.deckId, session.user.id);
  if (!deck) throw new Error("Deck not found");
  await saveGameRun({
    deckId: parsed.deckId,
    userId: session.user.id,
    template: parsed.template,
    score: parsed.score,
    maxScore: parsed.maxScore,
  });
  return { ok: true as const };
}
