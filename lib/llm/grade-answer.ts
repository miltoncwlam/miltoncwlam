import "server-only";

import { generateText } from "ai";

import { parseAiAllowed, shortTarget, typedMatches } from "@/lib/play/answers";
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/llm/config";
import { resolveOpenRouterFreeModel } from "@/lib/llm/openrouter-models";
import type { Flashcard } from "@/lib/types/flashcard";

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
    return { ok: false, why: "", source: "reject" };
  }

  const modelId = await resolveOpenRouterFreeModel();
  if (!modelId) {
    return { ok: false, why: "", source: "reject" };
  }

  try {
    const result = await generateText({
      model: getOpenRouterClient()(modelId),
      abortSignal: AbortSignal.timeout(12_000),
      prompt: `Is the student's answer allowed for this flashcard? Accept synonyms, abbreviations, extra words, and equivalent meaning. Reject wrong facts.
Reply with one word only: yes or no.
Prompt: ${input.card.front}
Expected: ${input.card.back}
Student: ${typed}`,
    });
    if (!parseAiAllowed(result.text)) {
      return { ok: false, why: "", source: "reject" };
    }
    return {
      ok: true,
      why: shortTarget(input.card) ?? input.card.back,
      source: "ai",
    };
  } catch {
    return { ok: false, why: "", source: "reject" };
  }
}
