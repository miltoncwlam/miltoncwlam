export function normalizeTrueFalse(value: string): "true" | "false" | null {
  const normalized = value.trim().toLowerCase();
  if (
    /^(true|t|正確|正确|對|对|是)$/i.test(normalized) ||
    normalized === "true"
  ) {
    return "true";
  }
  if (
    /^(false|f|錯誤|错误|錯|错|否)$/i.test(normalized) ||
    normalized === "false"
  ) {
    return "false";
  }
  return null;
}

export function trueFalseChoices(language?: string): [string, string] {
  if (language === "zh-Hant" || language === "zh-Hans") {
    return ["正確", "錯誤"];
  }
  return ["True", "False"];
}

export function isTrueFalseChoicePair(choices: string[]) {
  const flags = new Set(
    choices.map((choice) => normalizeTrueFalse(choice)).filter(Boolean),
  );
  return flags.has("true") && flags.has("false");
}

export function trueFalseAnswersMatch(student: string, answer: string) {
  const left = normalizeTrueFalse(student);
  const right = normalizeTrueFalse(answer);
  if (left && right) return left === right;
  return student.trim().toLowerCase() === answer.trim().toLowerCase();
}
