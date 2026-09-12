import { describe, expect, it } from "vitest";

import { readFile } from "node:fs/promises";

import {
  DEFAULT_EXAM_SYSTEM,
  examProfileRules,
  inferExamLane,
  parseExamSystem,
} from "@/lib/llm/exam-profiles";
import { TEST_FIXTURE_FILES, fixturePath } from "@/tests/fixtures/test-sources";

describe("exam lane infer", () => {
  it("reads S1 CH as HKDSE Chinese history", () => {
    const lane = inferExamLane({
      filename: "S1 CH L1.1 中華民族與早期國家的起源.pdf",
    });
    expect(lane.system).toBe("dse");
    expect(lane.subject).toBe("chinese-history");
  });

  it("reads an IGCSE filename as IGCSE biology when the source is photosynthesis", () => {
    const lane = inferExamLane({
      filename: "igcse-biology-photosynthesis.pdf",
      source: "Chlorophyll in chloroplasts absorbs sunlight.",
    });
    expect(lane.system).toBe("igcse");
    expect(lane.subject).toBe("biology");
  });

  it("defaults unknown English notes to HKDSE", () => {
    const lane = inferExamLane({
      title: "Untitled deck",
      source: "Plants need water, carbon dioxide, and light to photosynthesize.",
      language: "en",
    });
    expect(lane.system).toBe(DEFAULT_EXAM_SYSTEM);
    expect(lane.subject).toBe("biology");
  });

  it("does not treat carbon dioxide as chemistry", () => {
    expect(
      inferExamLane({ source: "The Calvin cycle fixes carbon dioxide into glucose." })
        .subject,
    ).toBe("biology");
  });

  it("parses only known boards", () => {
    expect(parseExamSystem("igcse")).toBe("igcse");
    expect(parseExamSystem("a-level")).toBe("a-level");
    expect(parseExamSystem("claude")).toBe("dse");
  });
});

describe("exam profile prompts", () => {
  it("writes command words per lane", () => {
    expect(examProfileRules({ system: "dse", kind: "exam" })).toMatch(/HKDSE/);
    expect(examProfileRules({ system: "dse", kind: "exam" })).toMatch(/解釋/);
    expect(examProfileRules({ system: "igcse", kind: "exam" })).toMatch(/define/);
    expect(examProfileRules({ system: "a-level", kind: "exam" })).toMatch(/evaluate/);
    expect(
      examProfileRules({
        system: "dse",
        subject: "chinese-history",
        kind: "mindmap",
      }),
    ).toMatch(/中國歷史/);
  });
});

describe("IGCSE fixture", () => {
  it("reads the committed IGCSE photosynthesis notes as IGCSE biology", async () => {
    const source = await readFile(fixturePath(TEST_FIXTURE_FILES.igcseText), "utf8");
    const lane = inferExamLane({
      filename: TEST_FIXTURE_FILES.igcseText,
      source,
    });
    expect(source).toMatch(/define photosynthesis/i);
    expect(lane.system).toBe("igcse");
    expect(lane.subject).toBe("biology");
  });
});
