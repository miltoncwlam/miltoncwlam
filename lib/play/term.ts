export const PLAY_TERM_MAX_CHARS = 40;
export const PLAY_TERM_MAX_WORDS = 6;
export const PLAY_CHIP_MAX_CHARS = 22;
export const PLAY_CHIP_MAX_WORDS = 4;
export const PLAY_HINT_MAX = 280;
export const PLAY_OPTION_MAX = 32;

export function stripTail(value: string) {
  return value.trim().replace(/[.。!！?？,，;；:：]+$/g, "").trim();
}

function wordCount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(trimmed) && !/\s/.test(trimmed)) {
    return trimmed.length;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function fitsPlayTerm(value: string) {
  const text = stripTail(value);
  if (!text) return false;
  return text.length <= PLAY_TERM_MAX_CHARS && wordCount(text) <= PLAY_TERM_MAX_WORDS;
}

export function fitsPlayChip(value: string) {
  const text = stripTail(value);
  if (!text) return false;
  return text.length <= PLAY_CHIP_MAX_CHARS && wordCount(text) <= PLAY_CHIP_MAX_WORDS;
}

function firstClause(value: string) {
  const split = value.split(/(?<=[.。!！?？;；])\s+|，|,/)[0]?.trim() ?? value.trim();
  return stripTail(split);
}

function firstWords(value: string, maxWords: number, maxChars: number) {
  const text = stripTail(value);
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text) && !/\s/.test(text)) {
    return text.slice(0, Math.min(maxWords, maxChars));
  }
  const words = text.split(/\s+/).filter(Boolean);
  let out = "";
  for (const word of words.slice(0, maxWords)) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > maxChars) break;
    out = next;
  }
  return out || text.slice(0, maxChars);
}

/** Split a long model answer into a tap-able term and leftover explanation. Never drops text. */
export function splitPlayTerm(rawBack: string, existingHint?: string | null) {
  const raw = rawBack.trim().replace(/\s+/g, " ");
  const prior = existingHint?.trim() ?? "";
  if (!raw) {
    return { back: "", hint: prior.slice(0, PLAY_HINT_MAX) || undefined };
  }
  if (fitsPlayTerm(raw)) {
    const hint = prior.slice(0, PLAY_HINT_MAX);
    return { back: stripTail(raw), hint: hint || undefined };
  }
  const clause = firstClause(raw);
  const back = fitsPlayTerm(clause)
    ? stripTail(clause)
    : firstWords(raw, PLAY_TERM_MAX_WORDS, PLAY_TERM_MAX_CHARS);
  const leftover = stripTail(raw.slice(back.length)).replace(/^[-–—:：]\s*/, "");
  const hint = [leftover, prior].filter(Boolean).join(" ").slice(0, PLAY_HINT_MAX);
  return { back: back || stripTail(raw).slice(0, PLAY_TERM_MAX_CHARS), hint: hint || undefined };
}

/** Second pass for local Gemma: if the term still will not fit a sprite, shorten further. */
export function tightenForChip(back: string, existingHint?: string | null) {
  const prior = existingHint?.trim() ?? "";
  if (fitsPlayChip(back)) {
    return { back: stripTail(back), hint: prior.slice(0, PLAY_HINT_MAX) || undefined };
  }
  const chip = firstWords(back, PLAY_CHIP_MAX_WORDS, PLAY_CHIP_MAX_CHARS);
  if (!chip) {
    return { back: stripTail(back), hint: prior.slice(0, PLAY_HINT_MAX) || undefined };
  }
  const leftover = stripTail(back.slice(chip.length)).replace(/^[-–—:：]\s*/, "");
  const hint = [leftover, prior].filter(Boolean).join(" ").slice(0, PLAY_HINT_MAX);
  return { back: stripTail(chip), hint: hint || undefined };
}
