"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import {
  answerQuizQuestion,
  getCardForQuiz,
  startQuizSession,
} from "@/lib/data/quizzes";
import { resolveCorrectChoice } from "@/lib/quiz/choices";

const idSchema = z.string().uuid();

export async function startQuizAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const { session: quiz } = await startQuizSession({
    deckId,
    userId: session.user.id,
  });
  redirect(`/decks/${deckId}/quiz?session=${quiz.id}`);
}

export async function answerQuizAction(input: {
  sessionId: string;
  deckId: string;
  cardId: string;
  selectedOption: string;
}) {
  const auth = await requireSession();
  const sessionId = idSchema.parse(input.sessionId);
  const cardId = idSchema.parse(input.cardId);
  const card = await getCardForQuiz(cardId);
  if (!card) throw new Error("Card not found");

  const result = await answerQuizQuestion({
    sessionId,
    userId: auth.user.id,
    cardId,
    selectedOption: input.selectedOption,
    correctAnswer: resolveCorrectChoice(card),
  });

  revalidatePath(`/decks/${input.deckId}/quiz`);
  return result;
}
