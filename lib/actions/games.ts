"use server";

import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { getClassLinkById } from "@/lib/data/class-links";
import { completeGameRun, startGameRun } from "@/lib/data/games";
import { getDeckWithCards } from "@/lib/data/decks";
import { gradeTypedAnswer } from "@/lib/llm/grade-answer";
import { playTemplateEnum } from "@/lib/play/templates";

const startSchema = z.object({
  deckId: z.string().uuid(),
  template: z.enum(playTemplateEnum()),
  clientKey: z.string().uuid(),
  classLinkId: z.string().uuid().optional(),
});

const completeSchema = z.object({
  deckId: z.string().uuid(),
  template: z.enum(playTemplateEnum()),
  score: z.number().int().min(0).max(10000),
  maxScore: z.number().int().min(0).max(10000),
  clientKey: z.string().uuid().optional(),
});

const gradeSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().min(1),
  typed: z.string().max(400),
});

export async function startGameRunAction(input: {
  deckId: string;
  template: string;
  clientKey: string;
  classLinkId?: string;
}) {
  const session = await requireSession();
  const parsed = startSchema.parse(input);
  const deck = await getDeckWithCards(parsed.deckId, session.user.id);
  if (!deck) throw new Error("Deck not found");
  const classLink = parsed.classLinkId
    ? await getClassLinkById(parsed.classLinkId)
    : null;
  const classLinkId =
    classLink && !classLink.revoked_at ? classLink.id : undefined;
  const run = await startGameRun({
    deckId: parsed.deckId,
    userId: session.user.id,
    template: parsed.template,
    clientKey: parsed.clientKey,
    classLinkId,
  });
  return { ok: true as const, stake: run.stake, clientKey: run.clientKey };
}

export async function completeGameRunAction(input: {
  deckId: string;
  template: string;
  score: number;
  maxScore: number;
  clientKey?: string;
}) {
  const session = await requireSession();
  const parsed = completeSchema.parse(input);
  const deck = await getDeckWithCards(parsed.deckId, session.user.id);
  if (!deck) throw new Error("Deck not found");
  const run = await completeGameRun({
    deckId: parsed.deckId,
    userId: session.user.id,
    template: parsed.template,
    score: parsed.score,
    maxScore: parsed.maxScore,
    cardCount: deck.cards.length,
    clientKey: parsed.clientKey,
  });
  return {
    ok: true as const,
    stake: run.stake,
    payout: run.payout,
    net: run.payout - run.stake,
  };
}

export async function gradeTypedAnswerAction(input: {
  deckId: string;
  cardId: string;
  typed: string;
}) {
  const session = await requireSession();
  const parsed = gradeSchema.parse(input);
  const deck = await getDeckWithCards(parsed.deckId, session.user.id);
  const card = deck?.cards.find((item) => item.id === parsed.cardId);
  if (!card) throw new Error("Card not found");
  return gradeTypedAnswer({ card, typed: parsed.typed });
}
