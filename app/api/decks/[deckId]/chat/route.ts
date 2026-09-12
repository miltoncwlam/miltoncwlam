import { z } from "zod";

import { requireApiSession } from "@/lib/auth-server";
import { creditsFromTokens } from "@/lib/credits/token-cost";
import { isGuestQuotaError } from "@/lib/credits/config";
import {
  assertAndSpendCredits,
  assertGenerateRateLimit,
  getOrRefreshCredits,
  refundCredits,
} from "@/lib/data/credits";
import { listDeckArtifacts } from "@/lib/data/artifacts";
import { getDeckWithCards } from "@/lib/data/decks";
import {
  insertNotebookChatMessage,
  listNotebookChatMessages,
} from "@/lib/data/notebook-chat";
import { studioSourceSlice } from "@/lib/i18n/locales";
import { parseExamSystem } from "@/lib/llm/exam-profiles";
import { generateNotebookChat } from "@/lib/llm/notebook-chat";
import { CHAT_OPENROUTER_MODEL, resolveBillingRates } from "@/lib/llm/models";
import { loadNotebookSource } from "@/lib/llm/load-notebook-source";
import { captureException } from "@/lib/sentry";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1_000),
});

export const maxDuration = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  const session = await requireApiSession();
  const { deckId } = await context.params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) {
    return Response.json({ error: "Notebook not found" }, { status: 404 });
  }
  const messages = await listNotebookChatMessages(deckId, session.user.id);
  return Response.json({ messages });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
) {
  let spentTextAmount = 0;
  let charged = false;
  let userId: string | undefined;
  const { deckId } = await context.params;

  try {
    const session = await requireApiSession();
    userId = session.user.id;
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
    const source = await loadNotebookSource(deck);
    const credits = await getOrRefreshCredits(userId);
    await assertGenerateRateLimit(userId, {
      provider: "openrouter",
      model: CHAT_OPENROUTER_MODEL,
      isUnlimited: credits.isUnlimited,
    });
    const slice = studioSourceSlice(source.text, "basic").slice(0, 4_000);
    const rates = resolveBillingRates({
      provider: "openrouter",
      modelId: CHAT_OPENROUTER_MODEL,
    });
    const estimateTokens = {
      inputTokens: 900 + Math.ceil(slice.length * 0.25),
      outputTokens: 400,
    };
    const textCredits = creditsFromTokens(estimateTokens, rates);
    const spent = await assertAndSpendCredits({
      userId,
      textAmount: textCredits,
      imageAmount: 0,
      reason: "generate_chat",
      skipBalance: Boolean(session.user.isGuest),
      meta: { deckId, model: CHAT_OPENROUTER_MODEL },
    });
    charged = true;
    spentTextAmount = spent.isUnlimited ? 0 : textCredits;

    const artifacts = await listDeckArtifacts(deck.id);
    const notes = artifacts.find((item) => item.kind === "notes");
    const mindmap = artifacts.find((item) => item.kind === "mindmap");
    const exam = artifacts.find((item) => item.kind === "exam");
    const history = await listNotebookChatMessages(deckId, userId, 12);
    const generated = await generateNotebookChat({
      source: slice,
      notesTitle: notes ? (notes.payload as NotesPayload).title : null,
      mindmapTitle: mindmap ? (mindmap.payload as MindmapPayload).title : null,
      examTitle: exam ? (exam.payload as ExamPayload).title : null,
      examSystem: parseExamSystem(deck.examSystem),
      language: deck.ingestProgress?.language,
      history: history.map((entry) => ({ role: entry.role, content: entry.content })),
      message: input.message,
    });

    const actual = creditsFromTokens(
      generated.usage.inputTokens || generated.usage.outputTokens
        ? generated.usage
        : estimateTokens,
      rates,
    );
    if (!spent.isUnlimited && spentTextAmount > actual) {
      await refundCredits({
        userId,
        textAmount: spentTextAmount - actual,
        imageAmount: 0,
        reason: "generate_reconcile",
        meta: { deckId, kind: "chat" },
      });
    }

    const userMessage = await insertNotebookChatMessage({
      deckId,
      userId,
      role: "user",
      content: input.message,
    });
    const assistant = await insertNotebookChatMessage({
      deckId,
      userId,
      role: "assistant",
      content: generated.reply,
    });
    return Response.json({
      reply: generated.reply,
      make: generated.make,
      messages: [userMessage, assistant],
    });
  } catch (error) {
    if (error instanceof Response) return error;
    captureException(error, { deckId, userId, route: "chat" });
    if (charged && userId && spentTextAmount > 0) {
      try {
        await refundCredits({
          userId,
          textAmount: spentTextAmount,
          imageAmount: 0,
          reason: "generate_refund",
          meta: { deckId, kind: "chat" },
        });
      } catch {
        // ignore
      }
    }
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid request"
        : error instanceof Error
          ? error.message
          : "Chat failed";
    const rateLimited = /too many generates/i.test(message);
    const guestQuota = isGuestQuotaError(error);
    return Response.json(
      { error: message, code: rateLimited ? "RATE_LIMITED" : undefined },
      { status: guestQuota ? 403 : rateLimited ? 429 : 400 },
    );
  }
}
