"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { rateWrongItem, removeWrongItem } from "@/lib/data/wrong-questions";

const idSchema = z.string().uuid();
const ratingSchema = z.enum(["easy", "ok", "hard"]);

export async function rateWrongItemAction(input: {
  itemId: string;
  deckId: string;
  rating: "easy" | "ok" | "hard";
}) {
  const session = await requireSession();
  const result = await rateWrongItem({
    itemId: idSchema.parse(input.itemId),
    userId: session.user.id,
    rating: ratingSchema.parse(input.rating),
  });
  revalidatePath(`/decks/${idSchema.parse(input.deckId)}/mistakes`);
  revalidatePath(`/decks/${idSchema.parse(input.deckId)}`);
  revalidatePath("/review");
  return result;
}

export async function removeWrongItemAction(input: {
  itemId: string;
  deckId: string;
}) {
  const session = await requireSession();
  const deckId = idSchema.parse(input.deckId);
  await removeWrongItem(idSchema.parse(input.itemId), session.user.id);
  revalidatePath(`/decks/${deckId}/mistakes`);
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/review");
}
