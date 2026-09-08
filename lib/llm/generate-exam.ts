import { generateObject } from "ai";

import { promptLanguageName } from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { generateObjectWithRetry } from "@/lib/llm/generate-object-retry";
import {
  clampExamDurationMinutes,
  examFillSchema,
  examSchema,
  parseExamPayload,
  planExamQuestions,
} from "@/lib/llm/parse-studio";
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

function addUsage(a: StudioUsage, b: StudioUsage): StudioUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  };
}

function typeCounts(sequence: ExamQuestionType[]) {
  const counts = new Map<ExamQuestionType, number>();
  for (const type of sequence) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, n]) => `${n} ${type}`)
    .join(", ");
}

export async function generateExam(input: {
  source: string;
  language?: string;
  model?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  types: ExamQuestionType[];
  durationMinutes?: number;
}): Promise<{ exam: ExamPayload; usage: StudioUsage }> {
  const language = promptLanguageName(input.language ?? "en");
  const types = input.types.length
    ? input.types
    : (["mcq", "short", "tf"] as ExamQuestionType[]);
  const duration = clampExamDurationMinutes(input.durationMinutes);
  const sequence = planExamQuestions(duration, types);
  const count = sequence.length;
  const difficulty = input.difficulty ?? "intermediate";
  const mix = typeCounts(sequence);
  const result = await generateObjectWithRetry(() =>
    generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: examSchema,
      abortSignal: AbortSignal.timeout(50_000),
      prompt: `Write a ${difficulty} exam paper in ${language} from this source.
This paper must be finishable in ${duration} minutes. Emit EXACTLY ${count} questions, ids q1 to q${count} with no gaps or repeats.
Question mix (longer types take more time): ${mix}.
Type rules — choices and pairs are required JSON fields for those types:
- long: extended written answer, marks 4–8, include markScheme.
- short: 1–3 sentence answer, marks 2–3, include markScheme.
- tf: prompt is a statement; choices must be ["True","False"]; answer is True or False.
- mcq: exactly 4 choices; answer is the correct choice text exactly.
- matching: 3–6 pairs {left, right}; answer is each left -> right on its own line.
- cloze_choice: prompt has one ____ blank; 4 choices; answer is the missing word.
- cloze_free: prompt has one ____ blank; answer is the missing word/phrase; no choices.
Keep each item short enough that a student can finish all ${count} questions in ${duration} minutes.
Questions must be answerable from the source. No invented facts.

Source:
${input.source.slice(0, 24_000)}`,
    }),
  );
  let usage = readUsage(result);
  let exam = parseExamPayload({
    ...result.object,
    durationMinutes: duration,
  });

  if (exam.questions.length < count) {
    const missing = count - exam.questions.length;
    try {
      const fill = await generateObjectWithRetry(() =>
        generateObject({
          model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
          schema: examFillSchema,
          abortSignal: AbortSignal.timeout(20_000),
          prompt: `Add EXACTLY ${missing} more ${difficulty} exam questions in ${language} from this source.
Continue ids after q${exam.questions.length}. Mix: ${mix}.
Same type rules as a ${duration}-minute paper (choices/pairs required for mcq/tf/matching/cloze_choice).
Source:
${input.source.slice(0, 16_000)}`,
        }),
      );
      usage = addUsage(usage, readUsage(fill));
      exam = parseExamPayload({
        title: exam.title,
        instructions: exam.instructions,
        durationMinutes: duration,
        questions: [...exam.questions, ...fill.object.questions].slice(
          0,
          24,
        ),
      });
    } catch {
      // Keep the shorter paper; studio still shows the actual count.
    }
  }

  exam = {
    ...exam,
    durationMinutes: duration,
    questions: exam.questions.slice(0, count),
  };
  return { exam, usage };
}
