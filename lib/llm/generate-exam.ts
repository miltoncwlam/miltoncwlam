import { generateObject } from "ai";

import { promptLanguageName } from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { examSchema, parseExamPayload } from "@/lib/llm/parse-studio";
import type { ExamPayload, ExamQuestionType } from "@/lib/types/notebook";

export type StudioUsage = {
  inputTokens: number;
  outputTokens: number;
};

function readUsage(result: {
  usage?: {
    inputTokens?: { total?: number } | number;
    outputTokens?: { total?: number } | number;
  };
}): StudioUsage {
  const input = result.usage?.inputTokens;
  const output = result.usage?.outputTokens;
  const inputTokens =
    typeof input === "number" ? input : Number(input?.total ?? 0);
  const outputTokens =
    typeof output === "number" ? output : Number(output?.total ?? 0);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  };
}

export async function generateExam(input: {
  source: string;
  language?: string;
  model?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  types: ExamQuestionType[];
  questionCount: number;
}): Promise<{ exam: ExamPayload; usage: StudioUsage }> {
  const language = promptLanguageName(input.language ?? "en");
  const types = input.types.length
    ? input.types
    : (["mcq", "short", "tf"] as ExamQuestionType[]);
  const count = Math.min(24, Math.max(4, input.questionCount));
  const difficulty = input.difficulty ?? "intermediate";
  const result = await generateObject({
    model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
    schema: examSchema,
    abortSignal: AbortSignal.timeout(50_000),
    prompt: `Write a ${difficulty} exam paper in ${language} from this source.
Exactly ${count} questions. Mix these types: ${types.join(", ")}.
Type rules:
- long: extended written answer, marks 4–8, include markScheme.
- short: 1–3 sentence answer, marks 2–3, include markScheme.
- tf: prompt is a statement; choices must be ["True","False"]; answer is True or False.
- mcq: exactly 4 choices; answer is the correct choice text exactly.
- matching: 3–6 pairs {left, right}; answer is each left -> right on its own line.
- cloze_choice: prompt has one ____ blank; 4 choices; answer is the missing word.
- cloze_free: prompt has one ____ blank; answer is the missing word/phrase; no choices.
Questions must be answerable from the source. No invented facts.

Source:
${input.source.slice(0, 24_000)}`,
  });
  return {
    exam: parseExamPayload(result.object),
    usage: readUsage(result),
  };
}
