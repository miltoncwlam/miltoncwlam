import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { captureException } from "@/lib/sentry";
import { isGuestQuotaError } from "@/lib/credits/config";
import { getDeckArtifact } from "@/lib/data/artifacts";
import { getDeckById, getDeckWithCards } from "@/lib/data/decks";
import { ingestJobTokenOk } from "@/lib/ingest/job-token";
import { parseIngestProgress } from "@/lib/ingest/progress";
import { LOCALE_CODES } from "@/lib/i18n/locales";
import {
  beginStudioArtifact,
  markStudioKindFailed,
  STUDIO_KINDS,
} from "@/lib/llm/studio-job";
import { EXAM_QUESTION_TYPES } from "@/lib/types/notebook";

const bodySchema = z.object({
  kind: z.enum(STUDIO_KINDS),
  language: z.enum(LOCALE_CODES).optional(),
  depth: z.enum(["basic", "detailed"]).optional(),
  purpose: z.enum(["starter", "exam"]).optional(),
  durationMinutes: z.number().int().min(10).max(90).optional(),
  types: z.array(z.enum(EXAM_QUESTION_TYPES)).min(1).max(7).optional(),
});

export const maxDuration = 180;

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  let userId: string | undefined;
  let kind: string | undefined;
  const { deckId } = await context.params;

  try {
    const jobToken = request.headers.get("x-ingest-job");
    let isGuest = false;
    if (ingestJobTokenOk(deckId, jobToken)) {
      const owned = await getDeckById(deckId);
      if (!owned) {
        return Response.json({ error: "Notebook not found" }, { status: 404 });
      }
      userId = owned.userId;
      isGuest = Boolean(parseIngestProgress(owned.ingestProgress)?.isGuest);
    } else {
      const session = await requireApiSession();
      userId = session.user.id;
      isGuest = Boolean(session.user.isGuest);
    }
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const deck = await getDeckWithCards(deckId, userId);
    if (!deck) {
      return Response.json({ error: "Notebook not found" }, { status: 404 });
    }
    if (deck.generationStatus !== "complete") {
      return Response.json(
        { error: "Wait until this notebook has finished reading." },
        { status: 409 },
      );
    }
    const input = bodySchema.parse(await request.json());
    kind = input.kind;
    const language =
      input.language ?? parseIngestProgress(deck.ingestProgress)?.language;
    if (ingestJobTokenOk(deckId, jobToken) && input.kind === "notes") {
      const existing = await getDeckArtifact(deckId, "notes");
      if (
        existing &&
        (existing.generationStatus === "complete" ||
          existing.generationStatus === "processing")
      ) {
        return Response.json({ ok: true, skipped: true, kind: "notes" });
      }
    }
    const started = await beginStudioArtifact({
      deck,
      kind: input.kind,
      language,
      depth: input.depth,
      purpose: input.purpose,
      durationMinutes: input.durationMinutes,
      examTypes: input.types,
      userId,
      isGuest,
    });
    return Response.json({
      ok: true,
      accepted: true,
      kind: started.kind,
      status: started.status,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    captureException(error, {
      deckId,
      userId,
      route: "artifacts",
      kind,
    });
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid request"
        : error instanceof Error
          ? error.message
          : "Generation failed";
    if (kind && userId) {
      await markStudioKindFailed(deckId, kind as (typeof STUDIO_KINDS)[number], message).catch(
        () => {},
      );
    }
    const rateLimited = /too many generates/i.test(message);
    const guestQuota = isGuestQuotaError(error);
    return Response.json(
      {
        error: message,
        code: guestQuota ? "GUEST_QUOTA" : rateLimited ? "RATE_LIMITED" : undefined,
        refunded: false,
      },
      { status: guestQuota ? 403 : rateLimited ? 429 : 400 },
    );
  }
}
