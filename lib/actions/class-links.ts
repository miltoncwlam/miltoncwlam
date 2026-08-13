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
import {
  classAssignFromQuery,
  classInviteSearch,
  classJoinPath,
} from "@/lib/play/activity";

const idSchema = z.string().uuid();

export async function createClassLinkAction(
  deckIdValue: string,
  options?: { activity?: string; dueOnly?: boolean; locked?: boolean },
) {
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
  revalidatePath(`/decks/${deckId}/class`);
  const assign = classAssignFromQuery({
    activity: options?.activity,
    due: options?.dueOnly ? "1" : undefined,
    lock: options?.locked ? "1" : undefined,
  });
  return `${env.NEXT_PUBLIC_APP_URL}/class/${token}${classInviteSearch(assign)}`;
}

export async function revokeClassLinkAction(formData: FormData) {
  const session = await requireSession();
  const linkId = idSchema.parse(formData.get("linkId"));
  const deckId = idSchema.parse(formData.get("deckId"));
  await revokeClassLink(linkId, session.user.id);
  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks/${deckId}/class`);
}

export async function joinClassAction(formData: FormData) {
  const session = await requireSession();
  const token = z.string().min(10).parse(formData.get("token"));
  const assign = classAssignFromQuery({
    activity:
      typeof formData.get("activity") === "string"
        ? String(formData.get("activity"))
        : null,
    due:
      typeof formData.get("due") === "string"
        ? String(formData.get("due"))
        : null,
    lock:
      typeof formData.get("lock") === "string"
        ? String(formData.get("lock"))
        : null,
  });
  const result = await joinClassLink(token, session.user.id);
  revalidatePath("/decks");
  redirect(
    classJoinPath(result.deckId, {
      ...assign,
      classLinkId: result.classLinkId,
    }),
  );
}
