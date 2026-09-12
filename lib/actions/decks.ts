"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import {
  deleteDeck,
  duplicateDeck,
  renameDeck,
  setDeckArchived,
  setDeckFolderTag,
  updateCard,
  updateExamSystem,
} from "@/lib/data/decks";
import { createSampleDeck } from "@/lib/data/sample-deck";
import { parseExamSystem } from "@/lib/llm/exam-profiles";
import { deleteSourceMedia } from "@/lib/supabase/storage";

const idSchema = z.string().uuid();
const cardSchema = z.object({
  cardId: z.string().uuid(),
  deckId: z.string().uuid(),
  front: z.string().trim().min(1).max(500),
  back: z.string().trim().min(1).max(2_000),
  hint: z.string().trim().max(180).optional(),
  category: z.string().trim().max(60).optional(),
});

export async function createSampleDeckAction() {
  const session = await requireSession();
  const deckId = await createSampleDeck(session.user.id);
  revalidatePath("/decks");
  redirect(`/decks/${deckId}`);
}

export async function updateCardAction(formData: FormData) {
  const session = await requireSession();
  const input = cardSchema.parse(Object.fromEntries(formData));
  const updated = await updateCard(input.cardId, session.user.id, input);
  if (!updated) throw new Error("Card not found");
  revalidatePath(`/decks/${input.deckId}`);
}

export async function deleteDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const storagePath = await deleteDeck(deckId, session.user.id);
  if (storagePath) await deleteSourceMedia(storagePath);
  revalidatePath("/");
  revalidatePath("/decks");
  redirect("/decks");
}

export async function renameDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const title = z.string().trim().min(1).max(100).parse(formData.get("title"));
  const ok = await renameDeck(deckId, session.user.id, title);
  if (!ok) throw new Error("Deck not found");
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

export async function updateExamSystemAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const examSystem = parseExamSystem(formData.get("examSystem"));
  const ok = await updateExamSystem(deckId, session.user.id, examSystem);
  if (!ok) throw new Error("Deck not found");
  revalidatePath(`/decks/${deckId}`);
}

export async function archiveDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const archived = formData.get("archived") === "true";
  const ok = await setDeckArchived(deckId, session.user.id, archived);
  if (!ok) throw new Error("Deck not found");
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  if (archived) redirect("/decks?filter=archived");
}

export async function duplicateDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const copyId = await duplicateDeck(deckId, session.user.id);
  if (!copyId) throw new Error("Deck not found");
  revalidatePath("/decks");
  redirect(`/decks/${copyId}`);
}

export async function setDeckFolderAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const raw = z.string().trim().max(40).parse(formData.get("folderTag") ?? "");
  const ok = await setDeckFolderTag(
    deckId,
    session.user.id,
    raw.length ? raw : null,
  );
  if (!ok) throw new Error("Deck not found");
  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

