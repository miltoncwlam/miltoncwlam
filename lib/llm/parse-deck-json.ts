import { z } from "zod";

import type { CardType, GeneratedDeck, GeneratedFlashcard } from "@/lib/types/flashcard";
import { sanitizeMcqFields } from "@/lib/quiz/choices";

export function mcqStyleRules() {
  return `Card style: only multiple choice.
- "options": exactly 4 short, same-kind, similar-length, plausible answers to THIS question (four cities, four organs, four numbers — never mix a name with a paragraph).
- "back": the short correct option text only. It MUST match one option exactly.
- Put any extra fact or "why" in "hint". Never put the why in "back" or "options".
- Wrong options must be tempting mistakes on the same topic, never unrelated facts from other cards.
Set "type":"mcq".`;
}

export class UnrelatedSourceError extends Error {
  code: "UNRELATED_SOURCE" | "INSUFFICIENT_CONTENT";

  constructor(
    message: string,
    code: "UNRELATED_SOURCE" | "INSUFFICIENT_CONTENT" = "UNRELATED_SOURCE",
  ) {
    super(message);
    this.name = "UnrelatedSourceError";
    this.code = code;
  }
}

/** Soft under-count tolerance for tiny local models (B1). */
export function isAcceptableCardCount(actual: number, expected: number) {
  if (actual < 3) return false;
  if (actual >= expected) return true;
  // Allow missing up to 2 cards, or within 80% for larger requests
  const minAllowed = Math.max(3, Math.min(expected - 2, Math.floor(expected * 0.8)));
  return actual >= minAllowed;
}

const FRONT_MAX = 160;
const BACK_MAX = 280;

const cardTypeSchema = z.enum(["qa", "definition", "cloze", "mcq"]);

const generatedCardSchema = z.object({
  front: z
    .string()
    .min(1)
    .max(400)
    .describe("Short question or prompt on the card front"),
  back: z
    .string()
    .min(1)
    .max(600)
    .describe("Concise answer on the card back"),
  hint: z.string().max(400).optional(),
  category: z.string().max(60).optional(),
  type: cardTypeSchema.optional(),
  options: z.array(z.string().min(1).max(120)).min(2).max(6).optional(),
  imagePrompt: z.string().max(280).optional(),
  imageSearchQuery: z.string().max(80).optional(),
});

/** Loose schema for cloud generateObject (exact count enforced in parse). */
export const flashcardSchema = z.object({
  title: z.string().min(1).max(100),
  cards: z.array(generatedCardSchema).min(3).max(30),
});

export function flashcardSchemaForCount(cardCount: number) {
  const n = Math.min(30, Math.max(3, cardCount));
  return z.object({
    title: z.string().min(1).max(100),
    cards: z.array(generatedCardSchema).length(n),
  });
}

const refusalSchema = z.object({
  error: z.enum(["UNRELATED_SOURCE", "INSUFFICIENT_CONTENT"]),
  message: z.string().min(1).max(400).optional(),
});

export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) {
      throw new Error("Model response did not include a JSON object");
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function throwIfRefusal(payload: unknown) {
  const refused = refusalSchema.safeParse(payload);
  if (!refused.success) return;
  const message =
    refused.data.message?.trim() ||
    (refused.data.error === "UNRELATED_SOURCE"
      ? "This doesn't look like study material we can turn into flashcards. Try notes, a lesson, or an article about a topic."
      : "There isn't enough useful study content here to make flashcards. Add more notes or a clearer source.");
  throw new UnrelatedSourceError(message, refused.data.error);
}

function normalizeCard(card: z.infer<typeof generatedCardSchema>): GeneratedFlashcard {
  const front = card.front.trim().slice(0, FRONT_MAX);
  let back = card.back.trim().slice(0, BACK_MAX);
  if (!front || !back) {
    throw new Error("Card missing front or back after normalization");
  }
  const type = (card.type ?? "qa") as CardType;
  let hint = card.hint?.trim().slice(0, 280) || undefined;
  let options =
    type === "mcq"
      ? (card.options ?? []).map((entry) => entry.trim()).filter(Boolean).slice(0, 6)
      : undefined;
  if (type === "mcq") {
    if (!options || options.length < 2) {
      throw new Error("MCQ cards need at least 2 options");
    }
    const sanitized = sanitizeMcqFields({ back, hint, options });
    back = sanitized.back.slice(0, BACK_MAX);
    hint = sanitized.hint?.slice(0, 280) || undefined;
    options = sanitized.options;
  }
  return {
    front,
    back,
    hint,
    category: card.category?.trim().slice(0, 60) || undefined,
    type,
    options,
    imagePrompt: card.imagePrompt?.trim().slice(0, 220) || undefined,
    imageSearchQuery: card.imageSearchQuery?.trim().slice(0, 80) || undefined,
  };
}

export function parseGeneratedDeck(
  payload: unknown,
  options?: { expectedCardCount?: number; softCount?: boolean },
): GeneratedDeck {
  throwIfRefusal(payload);

  const expected = options?.expectedCardCount
    ? Math.min(30, Math.max(3, options.expectedCardCount))
    : undefined;

  // Accept min..max here; cloud generateObject uses exact-length schema separately.
  const deck = flashcardSchema.parse(payload);
  const cards = deck.cards.map(normalizeCard);

  if (expected && cards.length < expected) {
    if (options?.softCount && isAcceptableCardCount(cards.length, expected)) {
      return { title: deck.title.trim().slice(0, 100), cards };
    }
    throw new Error(
      `Model returned ${cards.length} cards but ${expected} were requested`,
    );
  }

  if (expected && cards.length > expected) {
    return { title: deck.title.trim().slice(0, 100), cards: cards.slice(0, expected) };
  }

  return { title: deck.title.trim().slice(0, 100), cards };
}
