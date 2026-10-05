/** Notebook language wins. A DSE lane or a few Chinese words in an English source must not flip the tutor. */
export function chatRepliesInTraditionalChinese(input: {
  language?: string;
  source: string;
}): boolean {
  if (input.language === "zh-Hant" || input.language === "zh-Hans") return true;
  if (input.language) return false;
  const sample = input.source.slice(0, 800);
  const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
  const letters = (sample.match(/[A-Za-z]/g) || []).length;
  return cjk >= 24 && cjk > letters;
}
