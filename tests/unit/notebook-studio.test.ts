import { describe, expect, it } from "vitest";

import { layoutMindmap } from "@/components/mindmap-tree";
import { estimateArtifactOutputTokens } from "@/lib/credits/estimate-generation";
import { studioLanguageRules } from "@/lib/i18n/locales";
import { isRetryableGenerateError } from "@/lib/llm/generate-object-retry";
import {
  examCouldNotMarkResult,
  gradeExamExact,
  parseAiExamMarks,
  parseExamPayload,
  parseMindmapPayload,
  parseNotesPayload,
  planExamQuestions,
} from "@/lib/llm/parse-studio";
import { parseStudyNotes, sanitizeStudyMarkdown } from "@/lib/study/notes-markdown";
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
    expect(map.nodes.find((node) => node.id === "n4")?.parentId).toBe("n1");
    expect(map.nodes.filter((node) => node.parentId === "n1")).toHaveLength(3);
  });

  it("attaches cycles to the root and unique-ifies ids", () => {
    const map = parseMindmapPayload({
      title: "Cells",
      nodes: [
        { id: "root", parentId: null, label: "Cells" },
        { id: "a", parentId: "b", label: "Nucleus" },
        { id: "b", parentId: "a", label: "DNA" },
        { id: "dup", parentId: "root", label: "Membrane" },
        { id: "dup", parentId: "root", label: "Wall" },
      ],
    });
    expect(map.nodes.map((node) => node.id)).toEqual([
      "n1",
      "n2",
      "n3",
      "n4",
      "n5",
    ]);
    expect(map.nodes.filter((node) => node.parentId === null)).toHaveLength(1);
    expect(map.nodes[0]?.parentId).toBeNull();
    for (const node of map.nodes) {
      const seen = new Set<string>([node.id]);
      let current = node.parentId;
      while (current) {
        expect(seen.has(current)).toBe(false);
        seen.add(current);
        current = map.nodes.find((item) => item.id === current)?.parentId ?? null;
      }
    }
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

describe("study notes and mind map layout", () => {
  it("parses headings, lists, and skips a duplicate title", () => {
    const blocks = parseStudyNotes(
      `# Photosynthesis\n## Key terms\n- **Chlorophyll** — green pigment\n1. Light hits the leaf\n### Remember\nPlants make sugar.`,
      "Photosynthesis",
    );
    expect(blocks[0]).toEqual({ type: "h2", text: "Key terms" });
    expect(blocks.some((block) => block.type === "ul")).toBe(true);
    expect(blocks.some((block) => block.type === "ol")).toBe(true);
    expect(blocks.some((block) => block.type === "h3" && block.text === "Remember")).toBe(
      true,
    );
  });

  it("strips punycode and turns a wall of bold terms into a list", () => {
    const markdown =
      "xn--chs-6o4a1b5j7a: Palaeolithic Age **abdication (禪讓)** a king gives up the throne **feudal system (封建)** lords and fiefs **hegemons (霸主)** Spring and Autumn";
    const cleaned = sanitizeStudyMarkdown(markdown);
    expect(cleaned).not.toMatch(/xn--/i);
    expect(cleaned).toMatch(/## Key terms/);
    const blocks = parseStudyNotes(markdown, "Unit 1");
    expect(blocks.some((block) => block.type === "ul")).toBe(true);
    const list = blocks.find((block) => block.type === "ul");
    expect(list && list.type === "ul" && list.items.some((item) => /禪讓/.test(item))).toBe(
      true,
    );
  });

  it("splits inlined headings out of a single paragraph", () => {
    const blocks = parseStudyNotes(
      "Intro sentence. ## Key terms - chlorophyll makes food ## Facts light and water",
      "Photosynthesis",
    );
    expect(blocks.some((block) => block.type === "h2" && block.text === "Key terms")).toBe(
      true,
    );
  });

  it("asks Traditional Chinese models to write 繁體全文", () => {
    expect(studioLanguageRules("zh-Hant")).toMatch(/繁體中文/);
    expect(studioLanguageRules("zh-Hant")).toMatch(/Do not write English paragraphs/);
  });

  it("sanitizes stored notes markdown", () => {
    const notes = parseNotesPayload({
      title: "Unit 1",
      markdown:
        "xn--fq2c: filler text **abdication (禪讓)** a king gives up the throne **feudal system (封建)** lords **hegemons (霸主)** Spring and Autumn extra words here for length",
    });
    expect(notes.markdown).not.toMatch(/xn--/i);
    expect(notes.markdown).toMatch(/\*\*abdication/);
  });

  it("lays out a root and branches with connectors", () => {
    const laid = layoutMindmap(
      [
        { id: "n1", parentId: null, label: "Topic" },
        { id: "n2", parentId: "n1", label: "Branch A" },
        { id: "n3", parentId: "n1", label: "Branch B" },
        { id: "n4", parentId: "n2", label: "Leaf" },
      ],
      new Set(),
    );
    expect(laid.items).toHaveLength(4);
    expect(laid.items[0]?.x).toBe(laid.cx);
    expect(laid.items.filter((item) => item.parentId === "n1")).toHaveLength(2);
  });
});

describe("generate retry", () => {
  it("retries schema errors but not timeouts", () => {
    expect(isRetryableGenerateError(new Error("too_small"))).toBe(true);
    expect(isRetryableGenerateError(new Error("Invalid JSON response"))).toBe(true);
    expect(isRetryableGenerateError(new Error("NoObjectGenerated"))).toBe(true);
    expect(isRetryableGenerateError(new Error("This operation was aborted"))).toBe(
      false,
    );
    expect(isRetryableGenerateError(new Error("Unauthorized"))).toBe(false);
  });
});
