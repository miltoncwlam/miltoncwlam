import { describe, expect, it } from "vitest";

import { applySm2, defaultSrsState } from "@/lib/study/sm2";
import {
  autoCheckWrongItem,
  shouldClearWrongItem,
  wrongItemsFromResult,
} from "@/lib/study/wrong-questions";
import type {
  ExamQuestion,
  ExamQuestionResult,
} from "@/lib/types/notebook";

const mcq: ExamQuestion = {
  id: "q1",
  type: "mcq",
  prompt: "Which dynasty came first?",
  marks: 2,
  answer: "Xia",
  choices: ["Xia", "Shang", "Zhou"],
};

const written: ExamQuestion = {
  id: "q2",
  type: "long",
  prompt: "Explain the Mandate of Heaven.",
  marks: 6,
  answer: "Rulers keep power only while they govern well.",
  markScheme: "1 mark per point: virtue, natural disasters, rebellion.",
};

const tf: ExamQuestion = {
  id: "q3",
  type: "tf",
  prompt: "The Shang used oracle bones.",
  marks: 1,
  answer: "True",
};

function resultFor(
  id: string,
  marks: number,
  marksAwarded: number,
  feedback = "Partial.",
): ExamQuestionResult {
  return {
    id,
    ok: marksAwarded >= marks,
    marksAwarded,
    marks,
    feedback,
    source: "ai",
  };
}

describe("wrongItemsFromResult", () => {
  it("keeps wrong and partial questions with their snapshot", () => {
    const drafts = wrongItemsFromResult({
      questions: [mcq, written, tf],
      answers: { q1: "Shang", q2: "Kings are chosen by gods.", q3: "True" },
      result: [
        resultFor("q1", 2, 0, "Wrong dynasty."),
        resultFor("q2", 6, 3),
        resultFor("q3", 1, 1),
      ],
    });
    expect(drafts.map((draft) => draft.questionId)).toEqual(["q1", "q2"]);
    expect(drafts[0].question.prompt).toBe(mcq.prompt);
    expect(drafts[0].yourAnswer).toBe("Shang");
    expect(drafts[0].feedback).toBe("Wrong dynasty.");
    expect(drafts[1].marksAwarded).toBe(3);
  });

  it("skips questions the marker could not mark", () => {
    const drafts = wrongItemsFromResult({
      questions: [written],
      answers: { q2: "something" },
      result: [
        resultFor("q2", 6, 0, "Could not mark this answer. Submit again."),
      ],
    });
    expect(drafts).toEqual([]);
  });

  it("skips unknown question ids and zero-mark rows", () => {
    const drafts = wrongItemsFromResult({
      questions: [mcq],
      answers: {},
      result: [resultFor("nope", 2, 0), resultFor("q1", 0, 0)],
    });
    expect(drafts).toEqual([]);
  });
});

describe("autoCheckWrongItem", () => {
  it("auto-marks objective answers", () => {
    expect(autoCheckWrongItem(mcq, "Xia")).toEqual({
      rating: "ok",
      marksAwarded: 2,
    });
    expect(autoCheckWrongItem(mcq, "Zhou")?.rating).toBe("hard");
    expect(autoCheckWrongItem(tf, "True")?.rating).toBe("ok");
  });

  it("leaves written answers for self-rating", () => {
    expect(autoCheckWrongItem(written, "A partial answer.")).toBeNull();
  });

  it("treats an exact written match as correct", () => {
    expect(
      autoCheckWrongItem(written, "Rulers keep power only while they govern well."),
    ).toEqual({ rating: "ok", marksAwarded: 6 });
  });
});

describe("shouldClearWrongItem", () => {
  it("retires after the third drill when rated easy", () => {
    let state = defaultSrsState();
    state = applySm2(state, "easy");
    expect(shouldClearWrongItem("easy", state.repetitions)).toBe(false);
    state = applySm2(state, "ok");
    expect(shouldClearWrongItem("ok", state.repetitions)).toBe(false);
    state = applySm2(state, "easy");
    expect(shouldClearWrongItem("easy", state.repetitions)).toBe(true);
  });

  it("never clears on hard", () => {
    const state = applySm2(
      applySm2(applySm2(defaultSrsState(), "easy"), "easy"),
      "hard",
    );
    expect(shouldClearWrongItem("hard", state.repetitions)).toBe(false);
  });
});
