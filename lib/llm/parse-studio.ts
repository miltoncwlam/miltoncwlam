import { z } from "zod";

import { extractJsonObject } from "@/lib/llm/parse-deck-json";
import { sanitizeStudyMarkdown } from "@/lib/study/notes-markdown";
import { answersMatch } from "@/lib/quiz/choices";
import { EXAM_QUESTION_TYPES } from "@/lib/types/notebook";
import type {
  ExamMatchPair,
  ExamPayload,
  ExamQuestion,
  ExamQuestionResult,
  ExamQuestionType,
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
  options: z.array(z.string().min(1).max(160)).min(2).max(6).optional(),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1).max(120),
        right: z.string().min(1).max(120),
      }),
    )
    .min(2)
    .max(8)
    .optional(),
});

export const examSchema = z.object({
  title: z.string().min(1).max(120),
  instructions: z.string().max(400).optional().default(""),
  durationMinutes: z.number().int().min(10).max(90).optional(),
  questions: z.array(examQuestionSchema).min(4).max(24),
});

export const examFillSchema = z.object({
  questions: z.array(examQuestionSchema).min(1).max(20),
});

const storedExamSchema = examSchema.extend({
  questions: z.array(examQuestionSchema).min(1).max(24),
});

export const EXAM_COULD_NOT_MARK =
  "Could not mark this answer. Submit again.";

export function clampExamDurationMinutes(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(10, Math.round(n)));
}

export const MINUTES_PER_QUESTION_TYPE: Record<ExamQuestionType, number> = {
  tf: 1,
  mcq: 1,
  cloze_choice: 1,
  cloze_free: 2,
  matching: 3,
  short: 4,
  long: 8,
};

export function planExamQuestions(
  durationMinutes: number,
  types: ExamQuestionType[],
): ExamQuestionType[] {
  const duration = clampExamDurationMinutes(durationMinutes);
  const selected = types.length
    ? types
    : (["mcq", "short", "tf"] as ExamQuestionType[]);
  const cheapest = selected.reduce((a, b) =>
    MINUTES_PER_QUESTION_TYPE[a] <= MINUTES_PER_QUESTION_TYPE[b] ? a : b,
  );
  const sequence: ExamQuestionType[] = [];
  let used = 0;
  let i = 0;
  while (sequence.length < 24) {
    const type = selected[i % selected.length];
    const cost = MINUTES_PER_QUESTION_TYPE[type];
    if (
      sequence.length >= 4 &&
      used + cost > duration + Math.max(1, Math.floor(cost / 2))
    ) {
      break;
    }
    sequence.push(type);
    used += cost;
    i += 1;
    if (sequence.length >= 4 && used >= duration) break;
  }
  while (sequence.length < 4) sequence.push(cheapest);
  return sequence;
}

export function parseNotesPayload(payload: unknown): NotesPayload {
  const parsed = notesSchema.parse(
    typeof payload === "string" ? extractJsonObject(payload) : payload,
  );
  return {
    title: parsed.title.trim(),
    markdown: sanitizeStudyMarkdown(parsed.markdown),
  };
}

export function parseMindmapPayload(payload: unknown): MindmapPayload {
  const parsed = mindmapSchema.parse(
    typeof payload === "string" ? extractJsonObject(payload) : payload,
  );
  const remap = new Map<string, string>();
  parsed.nodes.forEach((node, index) => {
    const nextId = `n${index + 1}`;
    if (node.id && !remap.has(node.id)) remap.set(node.id, nextId);
  });

  const nodes = parsed.nodes.map((node, index) => {
    const id = `n${index + 1}`;
    const parentId =
      node.parentId && remap.has(node.parentId) && remap.get(node.parentId) !== id
        ? remap.get(node.parentId)!
        : null;
    return { id, parentId, label: node.label.trim() };
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rootId = nodes.find((node) => node.parentId === null)?.id ?? nodes[0]?.id;

  function wouldCycle(id: string, parentId: string | null) {
    let current = parentId;
    const seen = new Set([id]);
    while (current) {
      if (seen.has(current)) return true;
      seen.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
    return false;
  }

  if (rootId) {
    for (const node of nodes) {
      if (node.id === rootId) {
        node.parentId = null;
        continue;
      }
      if (!node.parentId || wouldCycle(node.id, node.parentId)) {
        node.parentId = rootId;
      }
    }

    function depthOf(id: string) {
      let depth = 0;
      let current = byId.get(id)?.parentId ?? null;
      const seen = new Set<string>();
      while (current && !seen.has(current)) {
        seen.add(current);
        depth += 1;
        current = byId.get(current)?.parentId ?? null;
      }
      return depth;
    }

    for (const node of nodes) {
      if (node.id === rootId) continue;
      if (depthOf(node.id) > 3) node.parentId = rootId;
    }
  }

  return { title: parsed.title, nodes };
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function pairsFromAnswer(answer: string): ExamMatchPair[] {
  const pairs: ExamMatchPair[] = [];
  for (const line of answer.split(/\n|;/)) {
    const match = line.match(/^\s*(.+?)\s*(?:->|→|=>|:)\s*(.+?)\s*$/);
    if (!match) continue;
    const left = match[1].trim();
    const right = match[2].trim();
    if (left && right) pairs.push({ left, right });
  }
  return pairs;
}

function repairExamQuestion(
  question: z.infer<typeof examQuestionSchema>,
  index: number,
): ExamQuestion {
  let type: ExamQuestionType = question.type;
  let choices = uniqueStrings([
    ...(question.choices ?? []),
    ...(question.options ?? []),
  ]);
  let pairs =
    question.pairs?.length ? question.pairs : pairsFromAnswer(question.answer);

  if (type === "tf") {
    choices = ["True", "False"];
  }

  if ((type === "mcq" || type === "cloze_choice") && question.answer.trim()) {
    const hasAnswer = choices.some((choice) =>
      answersMatch(choice, question.answer),
    );
    if (!hasAnswer) {
      choices = uniqueStrings([question.answer, ...choices]).slice(0, 6);
    }
  }

  if ((type === "mcq" || type === "cloze_choice") && choices.length < 2) {
    type = "short";
    choices = [];
  }

  if (type === "matching" && pairs.length < 2) {
    type = "short";
    pairs = [];
  }

  return {
    id: `q${index + 1}`,
    type,
    prompt: question.prompt,
    marks: question.marks || 1,
    answer: question.answer,
    markScheme: question.markScheme,
    choices:
      type === "tf" || type === "mcq" || type === "cloze_choice"
        ? choices
        : undefined,
    pairs: type === "matching" ? pairs : undefined,
  };
}

export function parseExamPayload(payload: unknown): ExamPayload {
  const parsed = storedExamSchema.parse(
    typeof payload === "string" ? extractJsonObject(payload) : payload,
  );
  return {
    title: parsed.title,
    instructions: parsed.instructions ?? "",
    durationMinutes: parsed.durationMinutes
      ? clampExamDurationMinutes(parsed.durationMinutes)
      : undefined,
    questions: parsed.questions.map((question, index) =>
      repairExamQuestion(question, index),
    ),
  };
}

export function parseAiExamMarks(
  text: string,
  maxMarks: number,
): { marksAwarded: number; feedback: string } {
  const max = Math.max(1, maxMarks);
  const trimmed = text.trim();
  const marksLine = trimmed.match(/MARKS:\s*(\d+)\s*(?:\/\s*\d+)?/i);
  const firstWord =
    trimmed
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z]/g, "")
      .toLowerCase() ?? "";
  let awarded: number | null = null;
  if (marksLine) {
    awarded = Number(marksLine[1]);
  } else if (firstWord === "yes") {
    awarded = max;
  } else if (firstWord === "no") {
    awarded = 0;
  } else {
    const firstNum = trimmed.split("\n")[0]?.match(/^\s*(\d+)\s*(?:\/\s*\d+)?/);
    if (firstNum) awarded = Number(firstNum[1]);
  }

  const feedback = trimmed
    .replace(/^\s*MARKS:[^\n]*\n?/i, "")
    .replace(/^\s*(yes|no)\b[^\n]*\n?/i, "")
    .trim();

  const impliesPartial =
    /\b(fraction|partial|some marks|part(?:ial)? credit|partly)\b/i.test(
      trimmed,
    );
  if (awarded === null && impliesPartial) {
    awarded = Math.max(1, Math.floor(max / 2));
  } else if (awarded === 0 && !marksLine && impliesPartial) {
    awarded = Math.max(1, Math.floor(max / 2));
  } else if (awarded === null) {
    awarded = 0;
  }

  awarded = Math.min(max, Math.max(0, Math.round(awarded)));
  return { marksAwarded: awarded, feedback };
}

export function examCouldNotMarkResult(
  question: ExamQuestion,
): ExamQuestionResult {
  return {
    id: question.id,
    ok: false,
    marksAwarded: 0,
    marks: question.marks,
    feedback: EXAM_COULD_NOT_MARK,
    source: "reject",
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

function matchingStudentMap(student: ExamStudentAnswer) {
  const map = new Map<string, string>();
  if (typeof student === "string") {
    for (const line of student.split("\n")) {
      const match = line.match(/^\s*(.+?)\s*(?:->|→|=>)\s*(.+?)\s*$/);
      if (!match) continue;
      map.set(match[1].trim().toLowerCase(), match[2].trim().toLowerCase());
    }
    return map;
  }
  for (const [left, right] of Object.entries(student)) {
    map.set(left.trim().toLowerCase(), String(right).trim().toLowerCase());
  }
  return map;
}

function gradeMatching(
  question: ExamQuestion,
  student: ExamStudentAnswer | undefined,
): ExamQuestionResult {
  const pairs = question.pairs ?? [];
  const map = matchingStudentMap(student ?? "");
  let correct = 0;
  for (const pair of pairs) {
    const got = map.get(pair.left.trim().toLowerCase());
    if (got && answersMatch(got, pair.right)) correct += 1;
  }
  const total = pairs.length || 1;
  let marksAwarded = 0;
  if (correct > 0) {
    marksAwarded = Math.max(
      1,
      Math.round((correct / pairs.length) * question.marks),
    );
    if (correct === pairs.length) marksAwarded = question.marks;
  }
  return {
    id: question.id,
    ok: marksAwarded === question.marks,
    marksAwarded,
    marks: question.marks,
    feedback: `${correct}/${pairs.length || total} pairs.`,
    source: correct === pairs.length && pairs.length > 0 ? "exact" : "reject",
  };
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
    return gradeMatching(question, student);
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
