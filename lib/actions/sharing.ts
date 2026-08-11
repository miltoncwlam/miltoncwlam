"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth-server";
import { writeAuditLog } from "@/lib/data/audit";
import {
  disableDeckSharing,
  enableDeckSharing,
} from "@/lib/data/shares";
import { createShareToken } from "@/lib/security/share-token";
import { env } from "@/lib/env";

const idSchema = z.string().uuid();

export async function enableSharingAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const token = createShareToken();
  const updated = await enableDeckSharing(deckId, session.user.id, token);
  if (!updated) throw new Error("Deck not found");
  await writeAuditLog({
    userId: session.user.id,
    action: "share_enable",
    entityType: "deck",
    entityId: deckId,
  });
  revalidatePath(`/decks/${deckId}`);
  return `${env.NEXT_PUBLIC_APP_URL}/share/${token}`;
}

export async function disableSharingAction(deckIdValue: string) {
  const session = await requireSession();
  const deckId = idSchema.parse(deckIdValue);
  const updated = await disableDeckSharing(deckId, session.user.id);
  if (!updated) throw new Error("Deck not found");
  revalidatePath(`/decks/${deckId}`);
}
