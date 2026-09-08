import { describe, expect, it } from "vitest";

import { estimateArtifactOutputTokens } from "@/lib/credits/estimate-generation";
import { isRetryableGenerateError } from "@/lib/llm/generate-object-retry";
import {
  examCouldNotMarkResult,
  gradeExamExact,
  parseAiExamMarks,
  parseExamPayload,
  parseMindmapPayload,
  planExamQuestions,
} from "@/lib/llm/parse-studio";
import type { ExamQuestion } from "@/lib/types/notebook";

describe("studio parsers", () => {
  it("links mind map nodes to a root", () => {
    const map = parseMindmapPayload({
      title: "Photosynthesis",
      nodes: [
        { id: "n1", parentId: null, label: "Photosynthesis" },
        { id: "n2", parentId: "n1", label: "Light" },
        { id: "n3", parentId: "n1", label: "Dark" },
        { id: "n4", parentId: "missing", label: "Orphan" },
      ],
    });
    expect(map.nodes.find((node) => node.id === "n4")?.parentId).toBeNull();
    expect(map.nodes.filter((node) => node.parentId === "n1")).toHaveLength(2);
  });

  it("keeps exam question types", () => {
    const exam = parseExamPayload({
      title: "Paper 1",
      instructions: "Answer all.",
      questions: [
        {
          id: "q1",
          type: "tf",
          prompt: "Water boils at 100 C at sea level.",
          marks: 1,
          answer: "True",
          choices: ["True", "False"],
        },
        {
          id: "q2",
          type: "mcq",
          prompt: "Chlorophyll is mainly in the",
          marks: 1,
          answer: "chloroplast",
          choices: ["nucleus", "chloroplast", "vacuole", "ribosome"],
        },
        {
          id: "q3",
          type: "short",
          prompt: "Name the gas plants release in light.",
          marks: 2,
          answer: "oxygen",
        },
        {
          id: "q4",
          type: "matching",
          prompt: "Match the organelle",
          marks: 2,
          answer: "nucleus -> DNA\nchloroplast -> photosynthesis",
          pairs: [
            { left: "nucleus", right: "DNA" },
            { left: "chloroplast", right: "photosynthesis" },
            { left: "mitochondria", right: "respiration" },
          ],
        },
      ],
    });
    expect(exam.questions).toHaveLength(4);
    expect(exam.questions[0].type).toBe("tf");
  });

  it("maps MCQ options onto choices", () => {
    const exam = parseExamPayload({
      title: "Paper",
      questions: [
        {
          id: "dup",
          type: "mcq",
          prompt: "Pick",
          marks: 1,
          answer: "b",
          options: ["a", "b", "c", "d"],
        },
      ],
    });
    expect(exam.questions[0].id).toBe("q1");
    expect(exam.questions[0].choices).toEqual(["a", "b", "c", "d"]);
  });

  it("builds matching pairs from answer lines", () => {
    const exam = parseExamPayload({
      title: "Paper",
      durationMinutes: 20,
      questions: [
        {
          id: "q9",
          type: "matching",
          prompt: "Match",
          marks: 3,
          answer: "left -> right\nup -> down",
        },
      ],
    });
    expect(exam.durationMinutes).toBe(20);
    expect(exam.questions[0].type).toBe("matching");
    expect(exam.questions[0].pairs).toEqual([
      { left: "left", right: "right" },
      { left: "up", right: "down" },
    ]);
  });
});

describe("exam exact grading", () => {
  const tf: ExamQuestion = {
    id: "q1",
    type: "tf",
    prompt: "The sky is blue.",
    marks: 1,
    answer: "True",
  };

  it("marks true/false and mcq exactly", () => {
    expect(gradeExamExact(tf, "True")?.ok).toBe(true);
    expect(gradeExamExact(tf, "False")?.ok).toBe(false);
  });

  it("marks cloze with choices exactly", () => {
    const question: ExamQuestion = {
      id: "q3",
      type: "cloze_choice",
      prompt: "Plants release ____ in light.",
      marks: 1,
      answer: "oxygen",
      choices: ["oxygen", "nitrogen", "carbon", "helium"],
    };
    expect(gradeExamExact(question, "oxygen")?.ok).toBe(true);
    expect(gradeExamExact(question, "nitrogen")?.ok).toBe(false);
  });

  it("marks matching pairs in any order", () => {
    const question: ExamQuestion = {
      id: "q2",
      type: "matching",
      prompt: "Match",
      marks: 2,
      answer: "a -> 1",
      pairs: [
        { left: "a", right: "1" },
        { left: "b", right: "2" },
        { left: "c", right: "3" },
      ],
    };
    expect(
      gradeExamExact(question, { b: "2", a: "1", c: "3" })?.ok,
    ).toBe(true);
    expect(gradeExamExact(question, { a: "2", b: "1", c: "3" })?.ok).toBe(false);
    const partial = gradeExamExact(question, { a: "1", b: "2", c: "wrong" });
    expect(partial?.ok).toBe(false);
    expect(partial?.marksAwarded).toBe(1);
  });
});

describe("exam AI mark parsing", () => {
  it("parses MARKS: 2/6", () => {
    const parsed = parseAiExamMarks(
      "MARKS: 2/6\nOnly a fraction of the available marks would be awarded.",
      6,
    );
    expect(parsed.marksAwarded).toBe(2);
    expect(parsed.feedback).toMatch(/fraction/i);
  });

  it("awards partial marks when the model says no then fraction", () => {
    const parsed = parseAiExamMarks(
      "no\nOnly a fraction of the available marks would be awarded.",
      6,
    );
    expect(parsed.marksAwarded).toBe(3);
  });

  it("keeps a timeout-style result visible", () => {
    const result = examCouldNotMarkResult({
      id: "q1",
      type: "long",
      prompt: "Explain",
      marks: 6,
      answer: "points",
    });
    expect(result.feedback).toMatch(/Could not mark/);
    expect(result.marksAwarded).toBe(0);
  });
});

describe("artifact energy", () => {
  it("charges exams more than a title-only ingest", () => {
    expect(estimateArtifactOutputTokens("exam", 12)).toBeGreaterThan(
      estimateArtifactOutputTokens("ingest"),
    );
  });
});

describe("exam length from minutes", () => {
  it("makes a longer paper when the time limit is longer", () => {
    const shortPaper = planExamQuestions(15, [
      "mcq",
      "tf",
      "short",
      "long",
    ]);
    const longPaper = planExamQuestions(60, [
      "mcq",
      "tf",
      "short",
      "long",
    ]);
    expect(shortPaper.length).toBeGreaterThanOrEqual(4);
    expect(longPaper.length).toBeGreaterThan(shortPaper.length);
  });
});

describe("generate retry", () => {
  it("retries schema errors but not timeouts", () => {
    expect(isRetryableGenerateError(new Error("too_small"))).toBe(true);
    expect(isRetryableGenerateError(new Error("NoObjectGenerated"))).toBe(true);
    expect(isRetryableGenerateError(new Error("This operation was aborted"))).toBe(
      false,
    );
    expect(isRetryableGenerateError(new Error("Unauthorized"))).toBe(false);
  });
});
