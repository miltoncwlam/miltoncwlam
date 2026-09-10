"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { listDeckArtifacts } from "@/lib/data/artifacts";
import { notebookIsPublishable } from "@/lib/community/hk-curriculum";
import {
  copyCommunityDeckToUser,
  setDeckVisibility,
} from "@/lib/data/community";
import { getDeckWithCards } from "@/lib/data/decks";
import { enableDeckSharing } from "@/lib/data/shares";
import { moderateDeckForCommunity } from "@/lib/llm/moderate-deck";
import { createShareToken } from "@/lib/security/share-token";
import { env } from "@/lib/env";

const idSchema = z.string().uuid();

export async function copyCommunityDeckAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const copiedId = await copyCommunityDeckToUser(deckId, session.user.id);
  revalidatePath("/decks");
  return copiedId;
}

export async function setUnlistedAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const token = createShareToken();
  const ok = await enableDeckSharing(deckId, session.user.id, token);
  if (!ok) throw new Error("Deck not found");
  await setDeckVisibility({
    deckId,
    userId: session.user.id,
    visibility: "unlisted",
    moderationStatus: "none",
    moderationReasons: null,
  });
  revalidatePath(`/decks/${deckId}`);
  return `${env.NEXT_PUBLIC_APP_URL}/share/${token}`;
}

export async function setPrivateAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const { disableDeckSharing } = await import("@/lib/data/shares");
  await disableDeckSharing(deckId, session.user.id);
  revalidatePath(`/decks/${deckId}`);
}

export async function submitPublicAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) throw new Error("Deck not found");
  const artifacts = await listDeckArtifacts(deck.id);
  const hasStudioItem = artifacts.some(
    (item) => item.generationStatus === "complete",
  );
  if (
    !notebookIsPublishable({
      generationStatus: deck.generationStatus,
      cardCount: deck.cards.length,
      hasStudioItem,
    })
  ) {
    throw new Error("Only a finished notebook with cards or studio items can be published");
  }

  await setDeckVisibility({
    deckId,
    userId: session.user.id,
    visibility: deck.visibility === "public" ? "public" : "unlisted",
    moderationStatus: "pending",
    moderationReasons: null,
  });

  const review = await moderateDeckForCommunity({
    title: deck.title,
    subjectTag: deck.subjectTag,
    cards: deck.cards,
    hasStudioItem,
  });

  if (!review.ok) {
    await setDeckVisibility({
      deckId,
      userId: session.user.id,
      visibility: "unlisted",
      moderationStatus: "rejected",
      moderationReasons: review.reasons.join(" "),
    });
    revalidatePath(`/decks/${deckId}`);
    return {
      ok: false as const,
      reasons: review.reasons,
      score: review.score,
    };
  }

  // Ensure a share token exists for public link access
  const token = createShareToken();
  await enableDeckSharing(deckId, session.user.id, token);
  await setDeckVisibility({
    deckId,
    userId: session.user.id,
    visibility: "public",
    moderationStatus: "approved",
    moderationReasons: review.reasons.join(" ") || null,
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/community");
  return {
    ok: true as const,
    reasons: review.reasons,
    score: review.score,
    shareUrl: `${env.NEXT_PUBLIC_APP_URL}/share/${token}`,
  };
}
