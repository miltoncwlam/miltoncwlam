import { describe, expect, it } from "vitest";

import {
  isTrueFalseChoicePair,
  normalizeTrueFalse,
  trueFalseAnswersMatch,
  trueFalseChoices,
} from "@/lib/exam/true-false";

describe("true/false exam labels", () => {
  it("treats 正確 and True as the same mark", () => {
    expect(normalizeTrueFalse("正確")).toBe("true");
    expect(normalizeTrueFalse("錯誤")).toBe("false");
    expect(trueFalseAnswersMatch("True", "正確")).toBe(true);
    expect(trueFalseAnswersMatch("False", "錯誤")).toBe(true);
    expect(isTrueFalseChoicePair(["正確", "錯誤"])).toBe(true);
  });

  it("uses 正確/錯誤 for Chinese papers", () => {
    expect(trueFalseChoices("zh-Hant")).toEqual(["正確", "錯誤"]);
    expect(trueFalseChoices("en")).toEqual(["True", "False"]);
  });
});
