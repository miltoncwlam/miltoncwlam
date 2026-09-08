import "server-only";

import { generateText } from "ai";

import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/llm/config";
import {
  examAnswerAsText,
  examCouldNotMarkResult,
  gradeExamExact,
  parseAiExamMarks,
} from "@/lib/llm/parse-studio";
import { resolveOpenRouterFreeModel } from "@/lib/llm/openrouter-models";
import type {
  ExamAnswers,
  ExamQuestion,
  ExamQuestionResult,
} from "@/lib/types/notebook";

export { gradeExamExact } from "@/lib/llm/parse-studio";

async function gradeWithAiOnce(question: ExamQuestion, typed: string) {
  const modelId = await resolveOpenRouterFreeModel();
  if (!isOpenRouterConfigured() || !modelId) {
    return examCouldNotMarkResult(question);
  }

  const long = question.type === "long";
  const result = await generateText({
    model: getOpenRouterClient()(modelId),
    abortSignal: AbortSignal.timeout(long ? 20_000 : 12_000),
    prompt: `Mark this exam answer. Use the mark scheme. Award partial credit when the student is partly right.
First line MUST be: MARKS: k/${question.marks}
where k is an integer from 0 to ${question.marks}. Then 1–3 sentences of feedback.
Prompt: ${question.prompt}
Mark scheme: ${question.markScheme || question.answer}
Student: ${typed}`,
  });
  const parsed = parseAiExamMarks(result.text, question.marks);
  return {
    id: question.id,
    ok: parsed.marksAwarded === question.marks,
    marksAwarded: parsed.marksAwarded,
    marks: question.marks,
    feedback: parsed.feedback || result.text.trim(),
    source: parsed.marksAwarded > 0 ? ("ai" as const) : ("reject" as const),
  };
}

async function gradeWithAi(question: ExamQuestion, typed: string) {
  if (!isOpenRouterConfigured()) {
    return examCouldNotMarkResult(question);
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await gradeWithAiOnce(question, typed);
    } catch {
      if (attempt === 0) continue;
      return examCouldNotMarkResult(question);
    }
  }
  return examCouldNotMarkResult(question);
}

async function mapPool<T>(
  jobs: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const out = new Array<T>(jobs.length);
  let index = 0;
  async function worker() {
    while (index < jobs.length) {
      const current = index;
      index += 1;
      out[current] = await jobs[current]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, jobs.length) }, () => worker()),
  );
  return out;
}

export async function gradeExamPaper(input: {
  questions: ExamQuestion[];
  answers: ExamAnswers;
}): Promise<ExamQuestionResult[]> {
  return mapPool(
    input.questions.map((question) => async () => {
      const exact = gradeExamExact(question, input.answers[question.id]);
      if (
        exact &&
        (exact.ok ||
          question.type === "tf" ||
          question.type === "mcq" ||
          question.type === "matching" ||
          question.type === "cloze_choice")
      ) {
        return exact;
      }
      return gradeWithAi(
        question,
        examAnswerAsText(input.answers[question.id]),
      );
    }),
    3,
  );
}
