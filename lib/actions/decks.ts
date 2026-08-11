"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/data/audit";
import {
  completeDeckGeneration,
  deleteDeck,
  duplicateDeck,
  failDeckGeneration,
  getDeckWithCards,
  renameDeck,
  setDeckArchived,
  setDeckFolderTag,
  updateCard,
} from "@/lib/data/decks";
import { createSampleDeck } from "@/lib/data/sample-deck";
import { extractStudyText } from "@/lib/ingest/extract-text";
import { validateFileSignature } from "@/lib/ingest/validate-upload";
import {
  generateFlashcardsFromContent,
  generateFlashcardsFromImage,
  generateFlashcardsFromTopic,
  TOPIC_SOURCE_MIME,
} from "@/lib/llm/generate-flashcards";
import {
  deleteSourceMedia,
  downloadSourceMedia,
} from "@/lib/supabase/storage";

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

export async function regenerateDeckAction(formData: FormData) {
  const session = await requireSession();
  const deckId = idSchema.parse(formData.get("deckId"));
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck || !deck.generationProvider) throw new Error("Deck not found");

  try {
    let generated;
    if (
      deck.sourceType === "text" &&
      deck.sourceContent &&
      deck.sourceMimeType === TOPIC_SOURCE_MIME
    ) {
      generated = await generateFlashcardsFromTopic(deck.sourceContent, {
        provider: deck.generationProvider,
        cardCount: Math.max(3, deck.cards.length),
      });
    } else if (deck.sourceType === "text" && deck.sourceContent) {
      generated = await generateFlashcardsFromContent(deck.sourceContent, {
        provider: deck.generationProvider,
        cardCount: Math.max(3, deck.cards.length),
      });
    } else if (deck.storagePath && deck.sourceMimeType) {
      const data = await downloadSourceMedia(deck.storagePath);
      validateFileSignature(data, deck.sourceMimeType);
      if (deck.sourceType === "photo") {
        generated = await generateFlashcardsFromImage(
          data,
          deck.sourceMimeType as "image/jpeg" | "image/png",
          {
            provider: deck.generationProvider,
            cardCount: Math.max(3, deck.cards.length),
          },
        );
      } else if (
        deck.generationProvider === "ollama" &&
        deck.sourceMimeType === "application/pdf"
      ) {
        const { pdfPagesToImages } = await import("@/lib/ingest/pdf-to-images");
        const { generateFlashcardsFromImages } = await import(
          "@/lib/llm/generate-flashcards"
        );
        const pages = await pdfPagesToImages(data);
        generated = await generateFlashcardsFromImages(
          pages.map((page) => ({
            data: page.data,
            mediaType: page.mediaType,
          })),
          {
            provider: deck.generationProvider,
            cardCount: Math.max(3, deck.cards.length),
          },
        );
      } else {
        generated = await generateFlashcardsFromContent(
          await extractStudyText(data, deck.sourceMimeType),
          {
            provider: deck.generationProvider,
            cardCount: Math.max(3, deck.cards.length),
          },
        );
      }
    } else {
      throw new Error(
        "The original source was removed for privacy. Create a new deck to regenerate.",
      );
    }

    await completeDeckGeneration(
      deckId,
      session.user.id,
      deck.title,
      generated.cards,
    );
    await writeAuditLog({
      userId: session.user.id,
      action: "regenerate_complete",
      entityType: "deck",
      entityId: deckId,
    });

    const { clearDeckSource } = await import("@/lib/data/decks");
    const leftoverPath = await clearDeckSource(deckId, session.user.id);
    if (leftoverPath) {
      try {
        await deleteSourceMedia(leftoverPath);
      } catch {
        // best-effort
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    await failDeckGeneration(deckId, session.user.id, message);
    throw error;
  }

  revalidatePath(`/decks/${deckId}`);
}
