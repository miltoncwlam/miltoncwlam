import { gradeExamExact } from "@/lib/llm/parse-studio";
import type { CardRating } from "@/lib/types/flashcard";
import type {
  ExamAnswers,
  ExamQuestion,
  ExamQuestionResult,
  ExamStudentAnswer,
} from "@/lib/types/notebook";

export type WrongItemDraft = {
  questionId: string;
  question: ExamQuestion;
  yourAnswer: ExamStudentAnswer | null;
  feedback: string;
  marks: number;
  marksAwarded: number;
};

const UNMARKABLE = /could not mark/i;

/** Questions that lost marks in a graded paper become 錯題. Unmarkable rows do not. */
export function wrongItemsFromResult(input: {
  questions: ExamQuestion[];
  answers: ExamAnswers;
  result: ExamQuestionResult[];
}): WrongItemDraft[] {
  const byId = new Map(input.questions.map((question) => [question.id, question]));
  const drafts: WrongItemDraft[] = [];
  for (const item of input.result) {
    if (item.marks <= 0 || item.marksAwarded >= item.marks) continue;
    if (UNMARKABLE.test(item.feedback)) continue;
    const question = byId.get(item.id);
    if (!question) continue;
    drafts.push({
      questionId: question.id,
      question,
      yourAnswer: input.answers[question.id] ?? null,
      feedback: item.feedback,
      marks: item.marks,
      marksAwarded: item.marksAwarded,
    });
  }
  return drafts;
}

/**
 * Objective questions (MCQ, true/false, matching, exact cloze) auto-check.
 * Written answers return null so the learner self-rates against the mark scheme.
 */
export function autoCheckWrongItem(
  question: ExamQuestion,
  answer: ExamStudentAnswer | undefined,
): { rating: CardRating; marksAwarded: number } | null {
  const result = gradeExamExact(question, answer);
  if (!result) return null;
  return {
    rating: result.marksAwarded >= result.marks ? "ok" : "hard",
    marksAwarded: result.marksAwarded,
  };
}

/** Retire an item once it has been drilled three times and the latest rating is easy. */
export function shouldClearWrongItem(
  rating: CardRating,
  nextRepetitions: number,
): boolean {
  return rating === "easy" && nextRepetitions >= 3;
}
