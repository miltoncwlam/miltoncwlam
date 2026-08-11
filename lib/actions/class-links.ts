"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import {
  createClassLink,
  joinClassLink,
  revokeClassLink,
} from "@/lib/data/class-links";
import { getDeckWithCards } from "@/lib/data/decks";
import { env } from "@/lib/env";
import { createShareToken } from "@/lib/security/share-token";

const idSchema = z.string().uuid();

export async function createClassLinkAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck || deck.generationStatus !== "complete") {
    throw new Error("Deck not ready for class mode");
  }
  const token = createShareToken();
  const id = await createClassLink(deckId, session.user.id, token);
  if (!id) throw new Error("Could not create class link");
  revalidatePath(`/decks/${deckId}`);
  return `${env.NEXT_PUBLIC_APP_URL}/class/${token}`;
}

export async function revokeClassLinkAction(formData: FormData) {
  const session = await requireSession();
  const linkId = idSchema.parse(formData.get("linkId"));
  const deckId = idSchema.parse(formData.get("deckId"));
  await revokeClassLink(linkId, session.user.id);
  revalidatePath(`/decks/${deckId}`);
}

export async function joinClassAction(formData: FormData) {
  const session = await requireSession();
  const token = z.string().min(10).parse(formData.get("token"));
  const result = await joinClassLink(token, session.user.id);
  revalidatePath("/decks");
  redirect(`/decks/${result.deckId}`);
}
