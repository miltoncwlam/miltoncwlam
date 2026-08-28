import { z } from "zod";

import { extractJsonObject } from "@/lib/llm/parse-deck-json";
import { answersMatch } from "@/lib/quiz/choices";
import { EXAM_QUESTION_TYPES } from "@/lib/types/notebook";
import type {
  ExamPayload,
  ExamQuestion,
  ExamQuestionResult,
  ExamStudentAnswer,
  MindmapPayload,
  NotesPayload,
} from "@/lib/types/notebook";

export const notebookTitleSchema = z.object({
  title: z.string().min(1).max(100),
  summary: z.string().max(280).optional(),
});

export const notesSchema = z.object({
  title: z.string().min(1).max(100),
  markdown: z.string().min(40).max(20_000),
});

export const mindmapSchema = z.object({
  title: z.string().min(1).max(100),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        parentId: z.string().max(40).nullable(),
        label: z.string().min(1).max(80),
      }),
    )
    .min(4)
    .max(40),
});

export const examQuestionSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(EXAM_QUESTION_TYPES),
  prompt: z.string().min(1).max(1_200),
  marks: z.number().int().min(1).max(20),
  answer: z.string().min(1).max(2_000),
  markScheme: z.string().max(800).optional(),
  choices: z.array(z.string().min(1).max(160)).min(2).max(6).optional(),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1).max(120),
        right: z.string().min(1).max(120),
      }),
    )
    .min(3)
    .max(8)
    .optional(),
});

export const examSchema = z.object({
  title: z.string().min(1).max(120),
  instructions: z.string().max(400).optional().default(""),
  questions: z.array(examQuestionSchema).min(4).max(24),
});

export function parseNotesPayload(payload: unknown): NotesPayload {
  return notesSchema.parse(
    typeof payload === "string" ? extractJsonObject(payload) : payload,
  );
}

export function parseMindmapPayload(payload: unknown): MindmapPayload {
  const parsed = mindmapSchema.parse(
    typeof payload === "string" ? extractJsonObject(payload) : payload,
  );
  const ids = new Set(parsed.nodes.map((node) => node.id));
  const nodes = parsed.nodes.map((node) => ({
    id: node.id,
    parentId: node.parentId && ids.has(node.parentId) ? node.parentId : null,
    label: node.label,
  }));
  if (!nodes.some((node) => node.parentId === null) && nodes[0]) {
    nodes[0] = { ...nodes[0], parentId: null };
  }
  return { title: parsed.title, nodes };
}

export function parseExamPayload(payload: unknown): ExamPayload {
  const parsed = examSchema.parse(
    typeof payload === "string" ? extractJsonObject(payload) : payload,
  );
  return {
    title: parsed.title,
    instructions: parsed.instructions ?? "",
    questions: parsed.questions.map((question, index) => ({
      ...question,
      id: question.id || `q${index + 1}`,
      marks: question.marks || 1,
    })),
  };
}

export function examAnswerAsText(answer: ExamStudentAnswer | undefined) {
  if (typeof answer === "string") return answer.trim();
  if (answer && typeof answer === "object") {
    return Object.entries(answer)
      .map(([left, right]) => `${left} -> ${right}`)
      .sort()
      .join("\n");
  }
  return "";
}

function matchingKey(pairs: { left: string; right: string }[]) {
  return pairs
    .map((pair) => `${pair.left.trim().toLowerCase()} -> ${pair.right.trim().toLowerCase()}`)
    .sort()
    .join("\n");
}

function studentMatchingKey(answer: ExamStudentAnswer) {
  if (typeof answer === "string") {
    return answer
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join("\n");
  }
  return Object.entries(answer)
    .map(([left, right]) => `${left.trim().toLowerCase()} -> ${String(right).trim().toLowerCase()}`)
    .sort()
    .join("\n");
}

export function gradeExamExact(
  question: ExamQuestion,
  student: ExamStudentAnswer | undefined,
): ExamQuestionResult | null {
  const typed = examAnswerAsText(student);
  if (!typed) {
    return {
      id: question.id,
      ok: false,
      marksAwarded: 0,
      marks: question.marks,
      feedback: "",
      source: "reject",
    };
  }

  if (question.type === "matching" && question.pairs?.length) {
    const ok = studentMatchingKey(student ?? "") === matchingKey(question.pairs);
    return {
      id: question.id,
      ok,
      marksAwarded: ok ? question.marks : 0,
      marks: question.marks,
      feedback: ok ? "Exact match." : "",
      source: ok ? "exact" : "reject",
    };
  }

  if (
    question.type === "tf" ||
    question.type === "mcq" ||
    question.type === "cloze_choice"
  ) {
    const ok = answersMatch(typed, question.answer);
    return {
      id: question.id,
      ok,
      marksAwarded: ok ? question.marks : 0,
      marks: question.marks,
      feedback: ok ? "Exact match." : "",
      source: ok ? "exact" : "reject",
    };
  }

  if (answersMatch(typed, question.answer)) {
    return {
      id: question.id,
      ok: true,
      marksAwarded: question.marks,
      marks: question.marks,
      feedback: "Exact match.",
      source: "exact",
    };
  }

  return null;
}
