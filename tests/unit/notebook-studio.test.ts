import { describe, expect, it } from "vitest";

import { estimateArtifactOutputTokens } from "@/lib/credits/estimate-generation";
import { isRetryableGenerateError } from "@/lib/llm/generate-object-retry";
import {
  gradeExamExact,
  parseExamPayload,
  parseMindmapPayload,
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
  });
});

describe("artifact energy", () => {
  it("charges exams more than a title-only ingest", () => {
    expect(estimateArtifactOutputTokens("exam", 12)).toBeGreaterThan(
      estimateArtifactOutputTokens("ingest"),
    );
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
