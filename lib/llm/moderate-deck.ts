import { generateText } from "ai";
import { z } from "zod";

import {
  assertLLMReady,
  assertOllamaReachable,
  getConfiguredProviders,
  getLLMConfig,
  resolveOllamaModel,
} from "@/lib/llm/config";
import { extractJsonObject } from "@/lib/llm/parse-deck-json";
import type { Flashcard, LLMProvider } from "@/lib/types/flashcard";
import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

const resultSchema = z.object({
  ok: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  reasons: z.array(z.string()).default([]),
});

export type ModerationResult = z.infer<typeof resultSchema>;

function getModel(provider: LLMProvider) {
  const config = getLLMConfig();
  switch (provider) {
    case "openai":
      return openai(config.openai.model);
    case "anthropic":
      return anthropic(config.anthropic.model);
    case "google":
      return google(config.google.model);
    case "ollama": {
      const ollama = createOpenAI({
        baseURL: `${config.ollama.baseUrl}/v1`,
        apiKey: "ollama",
        name: "ollama",
      });
      return ollama(resolveOllamaModel());
    }
  }
}

function pickProvider(): LLMProvider {
  const configured = getConfiguredProviders();
  if (configured.includes("ollama")) return "ollama";
  if (configured[0]) return configured[0];
  throw new Error("No LLM provider available to review this deck");
}

function heuristicGate(
  title: string,
  cards: Flashcard[],
): ModerationResult | null {
  if (cards.length < 3) {
    return {
      ok: false,
      score: 10,
      reasons: ["Need at least 3 cards before publishing to the community."],
    };
  }

  let teachable = 0;
  for (const card of cards) {
    const front = card.front.trim();
    const back = card.back.trim();
    if (
      front.length >= 8 &&
      front.length <= 200 &&
      back.length >= 2 &&
      back.length <= 320 &&
      !/undefined|lorem ipsum|asdf/i.test(`${front} ${back}`)
    ) {
      teachable += 1;
    }
  }

  const ratio = teachable / cards.length;
  if (ratio < 0.7) {
    return {
      ok: false,
      score: Math.round(ratio * 100),
      reasons: [
        "Too many cards look vague, oversized, or not study-ready. Tighten questions and answers, then resubmit.",
      ],
    };
  }

  if (!title.trim()) {
    return { ok: false, reasons: ["Add a clear deck title that matches the subject."] };
  }

  return null;
}

export async function moderateDeckForCommunity(input: {
  title: string;
  subjectTag?: string | null;
  cards: Flashcard[];
}): Promise<ModerationResult> {
  const heuristic = heuristicGate(input.title, input.cards);
  if (heuristic && !heuristic.ok) return heuristic;

  const provider = assertLLMReady(pickProvider());
  if (provider === "ollama") await assertOllamaReachable();

  const sample = input.cards.slice(0, 12).map((card, index) => ({
    n: index + 1,
    type: card.cardType,
    front: card.front.slice(0, 160),
    back: card.back.slice(0, 200),
  }));

  const prompt = `You review study flashcard decks for a public community library.
Apply a soft academic quality bar (not exam-board harsh):
- Safety: reject hate, spam, PII dumps, or joke/empty decks
- Structure: most cards need a clear question and matching answer (not essay walls)
- Study value: cards should teach a real fact/concept/skill
- Coverage: at least ~70% of cards should look teachable and on-topic for the title

Reply with JSON only:
{"ok": boolean, "score": 0-100, "reasons": string[]}

If ok is false, give 1–3 short user-facing reasons.
If ok is true, reasons can be empty or a brief compliment.

Title: ${input.title}
Subject: ${input.subjectTag ?? "general"}
Card count: ${input.cards.length}
Sample cards:
${JSON.stringify(sample, null, 2)}`;

  try {
    const result = await generateText({
      model: getModel(provider),
      abortSignal: AbortSignal.timeout(60_000),
      prompt,
    });
    const parsed = resultSchema.parse(extractJsonObject(result.text));
    return {
      ok: parsed.ok,
      score: parsed.score,
      reasons: parsed.reasons.slice(0, 5),
    };
  } catch {
    // If the model fails but heuristics passed, allow with a note
    return {
      ok: true,
      score: 72,
      reasons: ["Approved with basic quality checks (AI review unavailable)."],
    };
  }
}
