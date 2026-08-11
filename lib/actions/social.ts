"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import {
  addDeckComment,
  createModerationReport,
  likeCommunityDeck,
  unlikeCommunityDeck,
} from "@/lib/data/social";

const idSchema = z.string().uuid();

export async function likeDeckAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  await likeCommunityDeck(deckId, session.user.id);
  revalidatePath(`/community/${deckId}`);
  revalidatePath("/community");
}

export async function unlikeDeckAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  await unlikeCommunityDeck(deckId, session.user.id);
  revalidatePath(`/community/${deckId}`);
  revalidatePath("/community");
}

export async function commentDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const body = z.string().trim().min(1).max(280).parse(formData.get("body"));
  await addDeckComment(deckId, session.user.id, body);
  revalidatePath(`/community/${deckId}`);
}

export async function reportDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const reason = z.string().trim().min(3).max(120).parse(formData.get("reason"));
  const details = z
    .string()
    .trim()
    .max(500)
    .optional()
    .parse(formData.get("details") || undefined);
  await createModerationReport({
    deckId,
    reporterUserId: session.user.id,
    reason,
    details,
  });
  revalidatePath(`/community/${deckId}`);
}

export async function appealRejectedPublishAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const appealNote = z
    .string()
    .trim()
    .min(5)
    .max(500)
    .parse(formData.get("appealNote"));
  await createModerationReport({
    deckId,
    reporterUserId: session.user.id,
    reason: "appeal",
    appealNote,
    details: "Owner appeal after AI public rejection",
  });
  revalidatePath(`/decks/${deckId}`);
}
