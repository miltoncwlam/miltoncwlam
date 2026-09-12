import { describe, expect, it } from "vitest";

import { defaultCollapsedBranches, layoutMindmap } from "@/components/mindmap-tree";
import { copyableNotebookSource, notebookIsPublishable } from "@/lib/community/hk-curriculum";
import { estimateArtifactOutputTokens } from "@/lib/credits/estimate-generation";
import {
  studioIntentRules,
  studioLanguageRules,
  studioSourceSlice,
  studioSourceSections,
  notesSectionHeadings,
  mindmapLabelRules,
} from "@/lib/i18n/locales";
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
import { parseStudyNotes, sanitizeStudyMarkdown, splitNoteTerm, notesAreStudyReady, notesContainPromptLeak, forceStudyNotesShape } from "@/lib/study/notes-markdown";
import { mergeMindmapPayloads, mergeNotesPayloads } from "@/lib/llm/merge-studio";
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

  it("keeps Traditional Chinese true/false choices", () => {
    const exam = parseExamPayload({
      title: "試卷",
      instructions: "全答。",
      questions: [
        {
          id: "q1",
          type: "tf",
          prompt: "夏朝是傳說中的朝代。",
          marks: 1,
          answer: "正確",
          choices: ["正確", "錯誤"],
        },
      ],
    });
    expect(exam.questions[0]?.choices).toEqual(["正確", "錯誤"]);
    expect(gradeExamExact(exam.questions[0]!, "正確")?.ok).toBe(true);
    expect(gradeExamExact(exam.questions[0]!, "True")?.ok).toBe(true);
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
    expect(studioLanguageRules("zh-Hant")).toMatch(/書面語/);
    expect(studioLanguageRules("zh-Hant")).toMatch(/嘅/);
    expect(studioLanguageRules("zh-Hant")).toMatch(/Do not write English paragraphs/);
    expect(studioLanguageRules("zh-Hant")).toMatch(/Key terms/);
    expect(notesSectionHeadings("zh-Hant").terms).toBe("重點詞彙");
    expect(mindmapLabelRules("zh-Hant")).toMatch(/Traditional Chinese/);
  });

  it("splits a Chinese Key terms wall into a real list", () => {
    const markdown =
      "Key terms- 舊石器時代: 距今約170萬年到約8000年前，人類使用打製石器。- 新石器時代: 約7000年前開始，各地出現磨製石器。";
    const cleaned = sanitizeStudyMarkdown(markdown);
    expect(cleaned).toMatch(/## 重點詞彙/);
    expect(cleaned).not.toMatch(/## Key terms/);
    const blocks = parseStudyNotes(markdown, "史前至夏商周");
    expect(
      blocks.some((block) => block.type === "h2" && block.text === "重點詞彙"),
    ).toBe(true);
    const list = blocks.find((block) => block.type === "ul");
    expect(list && list.type === "ul" && list.items.length >= 2).toBe(true);
    expect(splitNoteTerm("舊石器時代: 距今約170萬年")?.term).toBe("舊石器時代");
  });

  it("drops instruction chatter from notes markdown", () => {
    const leaked = `## Key terms 注意：原文为英文，输出语言为英文。根据指令，输出全部使用英文
- **Chlorophyll** absorbs sunlight
## Facts
- The Calvin cycle fixes carbon dioxide into glucose.
- Oxygen is released as a byproduct.
- Plants need water, carbon dioxide, and light.
## How to remember
- Inputs are water, carbon dioxide, and light.`;
    const cleaned = sanitizeStudyMarkdown(leaked);
    expect(cleaned).not.toMatch(/根据指令/);
    expect(cleaned).not.toMatch(/unless the output language/i);
    expect(notesContainPromptLeak(leaked)).toBe(true);
    expect(notesAreStudyReady(cleaned)).toBe(true);
  });

  it("does not crash when stored notes have no title", () => {
    expect(() => parseStudyNotes("", undefined as unknown as string)).not.toThrow();
  });

  it("rebuilds headings and bullets from a short paragraph dump", () => {
    const shaped = forceStudyNotesShape(
      "Photosynthesis converts light energy into chemical energy in plants. Chlorophyll in chloroplasts absorbs sunlight.\nThe Calvin cycle fixes carbon dioxide into glucose.\nOxygen is released as a byproduct.\nPlants need water, carbon dioxide, and light to photosynthesize.",
      { terms: "Key terms", facts: "Facts", remember: "How to remember" },
    );
    expect(notesAreStudyReady(shaped)).toBe(true);
    expect(shaped).toMatch(/## Key terms/);
  });

  it("rebuilds notes from a single leaked paragraph using leftover sentences", () => {
    const shaped = forceStudyNotesShape(
      "注意：输出语言为英文. Photosynthesis converts light energy into chemical energy in plants. Chlorophyll in chloroplasts absorbs sunlight. The Calvin cycle fixes carbon dioxide into glucose. Oxygen is released as a byproduct. Plants need water, carbon dioxide, and light.",
      { terms: "Key terms", facts: "Facts", remember: "How to remember" },
    );
    expect(notesContainPromptLeak(shaped)).toBe(false);
    expect(notesAreStudyReady(shaped)).toBe(true);
  });

  it("joins a term card when the meaning sits on the next line with a colon and dash", () => {
    const markdown = `## 重點詞彙
- **舊石器時代**
：約一百七十萬年前至約八千年前，人類使用打製石器嘅時期 -
- **新石器時代**
：約七千年前開始，人類使用磨製石器 -`;
    const split = splitNoteTerm(
      "**舊石器時代**：約一百七十萬年前至約八千年前，人類使用打製石器嘅時期 -",
    );
    expect(split?.term).toBe("舊石器時代");
    expect(split?.meaning).toMatch(/^約一百七十/);
    expect(split?.meaning).not.toMatch(/^[：:]/);
    expect(split?.meaning).not.toMatch(/-\s*$/);
    const blocks = parseStudyNotes(markdown, "史前至夏商周");
    const list = blocks.find((block) => block.type === "ul");
    expect(list && list.type === "ul" && list.items.length >= 2).toBe(true);
    const first = splitNoteTerm(list && list.type === "ul" ? list.items[0]! : "");
    expect(first?.term).toBe("舊石器時代");
    expect(first?.meaning).toMatch(/打製石器/);
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

  it("places branch children in a vertical column, not a ring", () => {
    const laid = layoutMindmap(
      [
        { id: "n1", parentId: null, label: "Topic" },
        { id: "n2", parentId: "n1", label: "Branch A" },
        { id: "n3", parentId: "n1", label: "Branch B" },
        { id: "n4", parentId: "n2", label: "Leaf 1" },
        { id: "n5", parentId: "n2", label: "Leaf 2" },
      ],
      new Set(),
      true,
    );
    const kids = laid.items.filter((item) => item.parentId === "n2");
    expect(kids).toHaveLength(2);
    expect(Math.abs(kids[0]!.x - kids[1]!.x)).toBeLessThan(2);
    expect(Math.abs(kids[0]!.y - kids[1]!.y)).toBeGreaterThan(20);
    const branch = laid.items.find((item) => item.id === "n2");
    expect(Math.abs((kids[0]?.x ?? 0) - (branch?.x ?? 0))).toBeGreaterThan(80);
  });

  it("hides grandchildren until a branch is expanded", () => {
    const nodes = [
      { id: "n1", parentId: null, label: "Topic" },
      { id: "n2", parentId: "n1", label: "Branch A" },
      { id: "n3", parentId: "n1", label: "Branch B" },
      { id: "n4", parentId: "n2", label: "Leaf" },
    ];
    const collapsed = defaultCollapsedBranches(nodes);
    expect(collapsed.has("n2")).toBe(true);
    const laid = layoutMindmap(nodes, collapsed);
    expect(laid.items).toHaveLength(3);
    expect(laid.items.some((item) => item.id === "n4")).toBe(false);
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
    expect(isRetryableGenerateError(new Error("Notes leaked instructions"))).toBe(true);
    expect(isRetryableGenerateError(new Error("Notes were not study-ready"))).toBe(true);
    expect(isRetryableGenerateError(new Error("Unauthorized"))).toBe(false);
  });
});

describe("studio depth and purpose", () => {
  it("slices less source on basic and writes first-look rules", () => {
    const long = "x".repeat(20_000);
    expect(studioSourceSlice(long, "basic")).toHaveLength(12_000);
    expect(studioSourceSlice(long, "detailed")).toHaveLength(18_000);
    expect(studioIntentRules("basic", "starter", "mindmap")).toMatch(/8–14 nodes/);
    expect(studioIntentRules("detailed", "exam", "notes")).toMatch(/exam revision/);
  });

  it("sections a long source into at most three chunks", () => {
    const long = Array.from({ length: 12 }, (_, index) => `## Part ${index + 1}\n${"fact ".repeat(2_000)}`).join("\n");
    const sections = studioSourceSections(long, "basic");
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.length).toBeLessThanOrEqual(3);
    expect(sections.every((section) => section.length <= 12_000)).toBe(true);
    expect(sections.join("")).toMatch(/Part 1/);
  });
});

describe("studio merge", () => {
  it("merges notes bullets under the three headings", () => {
    const merged = mergeNotesPayloads(
      [
        {
          title: "Photosynthesis",
          markdown: "## Key terms\n- **Chlorophyll** pigment\n## Facts\n- Light becomes chemical energy\n## How to remember\n- Light in, sugar out",
        },
        {
          title: "More",
          markdown: "## Key terms\n- **Calvin cycle** carbon fixation\n## Facts\n- Oxygen is released\n## How to remember\n- Water is split",
        },
      ],
      "en",
    );
    expect(merged.title).toBe("Photosynthesis");
    expect(merged.markdown).toMatch(/Chlorophyll/);
    expect(merged.markdown).toMatch(/Calvin cycle/);
    expect(merged.markdown).toMatch(/## Key terms/);
  });

  it("merges mind maps onto one root", () => {
    const merged = mergeMindmapPayloads([
      {
        title: "Photosynthesis",
        nodes: [
          { id: "n1", parentId: null, label: "Photosynthesis" },
          { id: "n2", parentId: "n1", label: "Light" },
          { id: "n3", parentId: "n1", label: "Water" },
          { id: "n4", parentId: "n2", label: "Chlorophyll" },
        ],
      },
      {
        title: "Calvin",
        nodes: [
          { id: "n1", parentId: null, label: "Calvin" },
          { id: "n2", parentId: "n1", label: "CO2" },
          { id: "n3", parentId: "n1", label: "Glucose" },
          { id: "n4", parentId: "n1", label: "RuBP" },
        ],
      },
    ]);
    expect(merged.nodes.filter((node) => node.parentId === null)).toHaveLength(1);
    expect(merged.nodes.some((node) => node.label === "CO2")).toBe(true);
    expect(merged.nodes.length).toBeGreaterThan(4);
  });
});

describe("community notebook copy and publish", () => {
  it("keeps real source and rebuilds seed stubs from cards", () => {
    expect(
      copyableNotebookSource({
        sourceContent: "Chlorophyll absorbs light.",
        cards: [{ front: "Q", back: "A" }],
      }),
    ).toBe("Chlorophyll absorbs light.");
    const fromSeed = copyableNotebookSource({
      sourceContent: "seed:photosynthesis",
      cards: [{ front: "What is chlorophyll?", back: "Green pigment", hint: "leaf" }],
    });
    expect(fromSeed).toMatch(/What is chlorophyll/);
    expect(fromSeed).not.toMatch(/^seed:/i);
  });

  it("lets a complete notebook publish with cards or a studio item", () => {
    expect(
      notebookIsPublishable({
        generationStatus: "complete",
        cardCount: 3,
        hasStudioItem: false,
      }),
    ).toBe(true);
    expect(
      notebookIsPublishable({
        generationStatus: "complete",
        cardCount: 0,
        hasStudioItem: true,
      }),
    ).toBe(true);
    expect(
      notebookIsPublishable({
        generationStatus: "complete",
        cardCount: 2,
        hasStudioItem: false,
      }),
    ).toBe(false);
    expect(
      notebookIsPublishable({
        generationStatus: "processing",
        cardCount: 8,
        hasStudioItem: true,
      }),
    ).toBe(false);
  });
});

describe("studio cards keep notebook source", () => {
  it("does not call regenerateDeckAction or clearDeckSource from the studio path", async () => {
    const { existsSync } = await import("node:fs");
    const { readFile } = await import("node:fs/promises");
    const route = await readFile("app/api/decks/[deckId]/artifacts/route.ts", "utf8");
    const page = await readFile("app/decks/[deckId]/page.tsx", "utf8");
    const actions = await readFile("lib/actions/decks.ts", "utf8");
    expect(route).toMatch(/beginStudioArtifact/);
    expect(route).not.toMatch(/clearDeckSource/);
    expect(page).not.toMatch(/regenerateDeckAction/);
    expect(actions).not.toMatch(/regenerateDeckAction/);
    expect(actions).not.toMatch(/clearDeckSource/);
    expect(existsSync("app/api/decks/generate/route.ts")).toBe(false);
    expect(existsSync("app/api/decks/generate/progress/route.ts")).toBe(false);
  });
});
