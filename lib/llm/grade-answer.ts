import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { typedMatches } from "@/lib/play/answers";
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/llm/config";
import { resolveOpenRouterFreeModel } from "@/lib/llm/openrouter-models";
import type { Flashcard } from "@/lib/types/flashcard";

const gradeSchema = z.object({
  correct: z.boolean(),
  reason: z.string().min(1).max(160),
});

export type GradeResult = {
  ok: boolean;
  why: string;
  source: "exact" | "ai" | "reject";
};

export async function gradeTypedAnswer(input: {
  card: Flashcard;
  typed: string;
}): Promise<GradeResult> {
  const typed = input.typed.trim();
  if (!typed) {
    return { ok: false, why: "Type something first.", source: "reject" };
  }
  if (typedMatches(typed, input.card)) {
    return { ok: true, why: "Exact match.", source: "exact" };
  }
  if (!isOpenRouterConfigured()) {
    return {
      ok: false,
      why: input.card.back,
      source: "reject",
    };
  }

  const modelId = await resolveOpenRouterFreeModel();
  if (!modelId) {
    return { ok: false, why: input.card.back, source: "reject" };
  }

  try {
    const result = await generateObject({
      model: getOpenRouterClient()(modelId),
      schema: gradeSchema,
      abortSignal: AbortSignal.timeout(12_000),
      prompt: `Grade a flashcard answer. Accept synonyms, abbreviations, extra words, and equivalent meaning. Reject wrong facts.
Prompt: ${input.card.front}
Expected: ${input.card.back}
Student: ${typed}
JSON only.`,
    });
    return {
      ok: result.object.correct,
      why: result.object.reason,
      source: "ai",
    };
  } catch {
    return { ok: false, why: input.card.back, source: "reject" };
  }
}
