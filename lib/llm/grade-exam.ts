import "server-only";

import { generateText } from "ai";

import { parseAiAllowed } from "@/lib/play/answers";
import { getOpenRouterClient, isOpenRouterConfigured } from "@/lib/llm/config";
import { examAnswerAsText, gradeExamExact } from "@/lib/llm/parse-studio";
import { resolveOpenRouterFreeModel } from "@/lib/llm/openrouter-models";
import type {
  ExamAnswers,
  ExamQuestion,
  ExamQuestionResult,
} from "@/lib/types/notebook";

export { gradeExamExact } from "@/lib/llm/parse-studio";

async function gradeWithAi(question: ExamQuestion, typed: string) {
  if (!isOpenRouterConfigured()) {
    return {
      id: question.id,
      ok: false,
      marksAwarded: 0,
      marks: question.marks,
      feedback: "",
      source: "reject" as const,
    };
  }
  const modelId = await resolveOpenRouterFreeModel();
  if (!modelId) {
    return {
      id: question.id,
      ok: false,
      marksAwarded: 0,
      marks: question.marks,
      feedback: "",
      source: "reject" as const,
    };
  }

  const long = question.type === "long";
  try {
    const result = await generateText({
      model: getOpenRouterClient()(modelId),
      abortSignal: AbortSignal.timeout(long ? 20_000 : 12_000),
      prompt: long
        ? `Mark this exam answer. Use the mark scheme. Award full credit if the student covers the same points in their own words.
Reply with: first line "yes" or "no", then 2–3 sentences of feedback.
Prompt: ${question.prompt}
Mark scheme: ${question.markScheme || question.answer}
Student: ${typed}`
        : `Is the student's answer allowed? Accept synonyms and equivalent meaning. Reject wrong facts.
Reply with: first line "yes" or "no", then one sentence of feedback.
Prompt: ${question.prompt}
Expected: ${question.answer}
Student: ${typed}`,
    });
    const ok = parseAiAllowed(result.text);
    const feedback =
      result.text.replace(/^\s*(yes|no)\b[^\n]*\n?/i, "").trim() ||
      (ok ? question.answer : "");
    return {
      id: question.id,
      ok,
      marksAwarded: ok ? question.marks : 0,
      marks: question.marks,
      feedback,
      source: ok ? ("ai" as const) : ("reject" as const),
    };
  } catch {
    return {
      id: question.id,
      ok: false,
      marksAwarded: 0,
      marks: question.marks,
      feedback: "",
      source: "reject" as const,
    };
  }
}

export async function gradeExamPaper(input: {
  questions: ExamQuestion[];
  answers: ExamAnswers;
}): Promise<ExamQuestionResult[]> {
  const results: ExamQuestionResult[] = [];
  for (const question of input.questions) {
    const exact = gradeExamExact(question, input.answers[question.id]);
    if (
      exact &&
      (exact.ok ||
        question.type === "tf" ||
        question.type === "mcq" ||
        question.type === "matching" ||
        question.type === "cloze_choice")
    ) {
      results.push(exact);
      continue;
    }
    results.push(
      await gradeWithAi(question, examAnswerAsText(input.answers[question.id])),
    );
  }
  return results;
}
