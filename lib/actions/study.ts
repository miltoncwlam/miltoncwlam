"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import {
  rateAndAdvance,
  restartStudySession,
  startSharedStudySession,
} from "@/lib/data/study";

const idSchema = z.string().uuid();
const ratingSchema = z.enum(["easy", "ok", "hard"]);

export async function startStudyAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const shuffled = formData.get("shuffle") === "true";
  const due = formData.get("due") === "true";
  // Auth gate only — the study page creates the session from query flags.
  void session;
  redirect(
    `/decks/${deckId}/study?new=1${due ? "&due=1" : ""}${
      shuffled ? "&shuffle=true" : ""
    }`,
  );
}

export async function startSharedStudyAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const token = z.string().min(20).max(100).parse(formData.get("token"));
  await startSharedStudySession(deckId, session.user.id);
  redirect(`/share/${token}?progress=saved`);
}

export async function restartStudyAction(input: {
  sessionId: string;
  deckId: string;
  shuffled: boolean;
}) {
  const session = await requireSession();
  await restartStudySession(
    idSchema.parse(input.sessionId),
    session.user.id,
    input.shuffled,
  );
  revalidatePath(`/decks/${idSchema.parse(input.deckId)}/study`);
}

export async function rateCardAction(input: {
  sessionId: string;
  cardId: string;
  rating: "easy" | "ok" | "hard";
}) {
  const session = await requireSession();
  return rateAndAdvance({
    sessionId: idSchema.parse(input.sessionId),
    userId: session.user.id,
    cardId: idSchema.parse(input.cardId),
    rating: ratingSchema.parse(input.rating),
  });
}
