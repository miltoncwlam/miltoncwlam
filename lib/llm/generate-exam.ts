import { generateObject } from "ai";

import { studioIntentRules, studioLanguageRules, studioRequirementsLine, studioSourceSlice, type StudioDepth, type StudioPurpose } from "@/lib/i18n/locales";
import { examProfileRules, type ExamSubjectBrain, type ExamSystem } from "@/lib/llm/exam-profiles";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import {
  generateObjectWithRetry,
  isGenerateTimeout,
  shorterStudySource,
  studyPoints,
} from "@/lib/llm/generate-object-retry";
import { ollamaGenerateJson } from "@/lib/llm/ollama";
import {
  clampExamDurationMinutes,
  examFillSchema,
  examSchema,
  parseExamPayload,
  planExamQuestions,
} from "@/lib/llm/parse-studio";
import type { ExamPayload, ExamQuestionType } from "@/lib/types/notebook";
import type { LLMProvider } from "@/lib/types/flashcard";
import { trueFalseChoices } from "@/lib/exam/true-false";

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

function examDespiteTimeout(source: string, duration: number): ExamPayload {
  const points = studyPoints(source, 8);
  const questions = points.slice(0, 8).map((point, index) => {
    const words = point.replace(/[.!?。！？]$/, "").split(/\s+/).filter(Boolean);
    const cloze = words.length >= 6;
    const answer = cloze ? words.slice(-3).join(" ") : point;
    const prompt = cloze
      ? `${words.slice(0, -3).join(" ")} ____`
      : `Write one sentence about: ${words.slice(0, 8).join(" ")}`;
    return {
      id: `q${index + 1}`,
      type: cloze ? ("cloze_free" as const) : ("short" as const),
      prompt: prompt.slice(0, 1_000),
      marks: 2,
      answer: answer.slice(0, 500),
      markScheme: point.slice(0, 400),
    };
  });
  if (questions.length < 1) {
    throw new Error("Not enough usable study content. Add more notes or try a longer source.");
  }
  return parseExamPayload({
    title: "Exam paper",
    instructions: "This paper uses a shorter cut of the source because the full draft ran long.",
    durationMinutes: duration,
    questions,
  });
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
  depth?: StudioDepth;
  purpose?: StudioPurpose;
  types: ExamQuestionType[];
  durationMinutes?: number;
  provider?: LLMProvider;
  examSystem?: ExamSystem;
  examSubject?: ExamSubjectBrain;
  requirements?: string;
}): Promise<{ exam: ExamPayload; usage: StudioUsage }> {
  const types = input.types.length
    ? input.types
    : (["mcq", "short", "tf"] as ExamQuestionType[]);
  const duration = clampExamDurationMinutes(input.durationMinutes);
  const sequence = planExamQuestions(duration, types);
  const count = sequence.length;
  const depth = input.depth ?? "basic";
  const purpose = input.purpose ?? "starter";
  const difficulty =
    input.difficulty ??
    (purpose === "exam" ? "advanced" : depth === "detailed" ? "intermediate" : "beginner");
  const mix = typeCounts(sequence);
  const tf = trueFalseChoices(input.language);
  const sourceText = studioSourceSlice(input.source, depth);
  const examPrompt = `Write a ${difficulty} exam paper from this source.
${studioLanguageRules(input.language ?? "en")}
${studioIntentRules(depth, purpose, "exam")}
${examProfileRules({
  system: input.examSystem ?? "dse",
  subject: input.examSubject,
  kind: "exam",
})}
This paper must be finishable in ${duration} minutes. Emit EXACTLY ${count} questions, ids q1 to q${count} with no gaps or repeats.
Question mix (longer types take more time): ${mix}.
Type rules — choices and pairs are required JSON fields for those types:
- long: extended written answer, marks 4–8, include markScheme.
- short: 1–3 sentence answer, marks 2–3, include markScheme.
- tf: prompt is a statement; choices must be ${JSON.stringify(tf)}; answer is ${tf[0]} or ${tf[1]}.
- mcq: exactly 4 choices; answer is the correct choice text exactly.
- matching: 3–6 pairs {left, right}; answer is each left -> right on its own line.
- cloze_choice: prompt has one ____ blank; 4 choices; answer is the missing word.
- cloze_free: prompt has one ____ blank; answer is the missing word/phrase; no choices.
Keep each item short enough that a student can finish all ${count} questions in ${duration} minutes.
Questions must be answerable from the source. No invented facts.
${studioRequirementsLine(input.requirements)}
Source:
${sourceText}`;
  const askExam = async (prompt: string, timeoutMs: number) => {
    if (input.provider === "ollama") {
      return {
        object: examSchema.parse(await ollamaGenerateJson(prompt)),
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }
    return generateObjectWithRetry(() =>
      generateObject({
        model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
        schema: examSchema,
        abortSignal: AbortSignal.timeout(timeoutMs),
        maxRetries: 0,
        prompt,
      }),
    );
  };
  let result;
  try {
    try {
      result = await askExam(examPrompt, 55_000);
    } catch (error) {
      if (!isGenerateTimeout(error) || sourceText.length <= 2_500) throw error;
      const shorter = shorterStudySource(sourceText);
      const shorterPrompt = examPrompt.replace(sourceText, shorter);
      result = await askExam(shorterPrompt, 20_000);
    }
  } catch (error) {
    if (!isGenerateTimeout(error)) throw error;
    const exam = examDespiteTimeout(shorterStudySource(sourceText), duration);
    return { exam, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  let usage = readUsage(result);
  let exam = parseExamPayload({
    ...result.object,
    durationMinutes: duration,
  });

  if (exam.questions.length < count) {
    const missing = count - exam.questions.length;
    const fillPrompt = `Add EXACTLY ${missing} more ${difficulty} exam questions from this source.
${studioLanguageRules(input.language ?? "en")}
${studioIntentRules(depth, purpose, "exam")}
${examProfileRules({
  system: input.examSystem ?? "dse",
  subject: input.examSubject,
  kind: "exam",
})}
Continue ids after q${exam.questions.length}. Mix: ${mix}.
Same type rules as a ${duration}-minute paper (choices/pairs required for mcq/tf/matching/cloze_choice). tf choices ${JSON.stringify(tf)}.
${studioRequirementsLine(input.requirements)}
Source:
${studioSourceSlice(input.source, depth)}`;
    try {
      const fill =
        input.provider === "ollama"
          ? {
              object: examFillSchema.parse(await ollamaGenerateJson(fillPrompt)),
              usage: { inputTokens: 0, outputTokens: 0 },
            }
          : await generateObjectWithRetry(() =>
              generateObject({
                model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
                schema: examFillSchema,
                abortSignal: AbortSignal.timeout(20_000),
              maxRetries: 0,
                prompt: fillPrompt,
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
