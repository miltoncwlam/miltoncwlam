import {
  answersMatch,
  normalizeAnswer,
  resolveCorrectChoice,
} from "@/lib/quiz/choices";
import type { Flashcard } from "@/lib/types/flashcard";
import { fitsPlayChip, fitsPlayTerm, stripTail } from "@/lib/play/term";

export {
  splitPlayTerm,
  tightenForChip,
  fitsPlayChip,
  fitsPlayTerm,
  PLAY_CHIP_MAX_CHARS,
  PLAY_TERM_MAX_CHARS,
} from "@/lib/play/term";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "is",
  "it",
  "as",
  "by",
  "with",
]);

export function promptText(card: Flashcard) {
  return card.front.replace(/\{\{blank\}\}/gi, "____");
}

export function shortTarget(card: Flashcard): string | null {
  const choice = stripTail(resolveCorrectChoice(card));
  if (choice && fitsPlayTerm(choice)) return choice;
  const back = stripTail(card.back);
  if (back && fitsPlayTerm(back)) return back;
  return null;
}

/** Tap-able label for Play sprites. Never a truncated paragraph. */
export function playChip(card: Flashcard): string | null {
  const choice = stripTail(resolveCorrectChoice(card));
  if (choice && fitsPlayChip(choice)) return choice;
  const target = shortTarget(card);
  if (target && fitsPlayChip(target)) return target;
  const back = stripTail(card.back);
  if (back && fitsPlayChip(back)) return back;
  return null;
}

export function chipCards(cards: Flashcard[]) {
  return cards.filter((card) => playChip(card));
}

export function spellingWord(card: Flashcard): string | null {
  const target = shortTarget(card);
  if (!target) return null;
  const letters = target.toUpperCase().replace(/[^A-Z]/g, "");
  if (letters.length < 3 || letters.length > 14) return null;
  return letters;
}

export function typedMatches(input: string, card: Flashcard) {
  const typed = input.trim();
  if (!typed) return false;
  if (answersMatch(typed, card.back)) return true;
  if (answersMatch(typed, resolveCorrectChoice(card))) return true;
  const target = shortTarget(card);
  if (target && answersMatch(typed, target)) return true;
  const n = normalizeAnswer(typed);
  const back = normalizeAnswer(card.back);
  return n.length >= 4 && (back === n || back.startsWith(`${n} `));
}

/** First word of the grader reply. Only `yes` counts as allowed. */
export function parseAiAllowed(text: string) {
  const word =
    text
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z]/g, "")
      .toLowerCase() ?? "";
  return word === "yes";
}

export function clozeBlank(card: Flashcard): {
  sentence: string;
  answer: string;
} | null {
  const front = card.front;
  if (/\{\{blank\}\}/i.test(front) || /_{3,}/.test(front)) {
    const answer = shortTarget(card) ?? card.back.replace(/[.。]+$/g, "").trim();
    if (!answer || answer.split(/\s+/).length > 4) return null;
    return {
      sentence: front.replace(/\{\{blank\}\}/gi, "____").replace(/_{3,}/g, "____"),
      answer,
    };
  }
  const source = card.back.replace(/[.。!！?？]+$/g, "").trim();
  const words = source.split(/\s+/);
  if (words.length < 4) return null;
  const candidates = words.filter((word) => {
    const clean = word.replace(/[^A-Za-z]/g, "");
    return clean.length >= 4 && !STOPWORDS.has(clean.toLowerCase());
  });
  const pick = candidates[Math.min(1, candidates.length - 1)];
  if (!pick) return null;
  const answer = pick.replace(/[^A-Za-z'-]/g, "");
  if (answer.length < 3) return null;
  const sentence = source.replace(pick, "____");
  if (!sentence.includes("____")) return null;
  return { sentence, answer };
}

export function categoryOf(card: Flashcard) {
  const value = card.category?.trim();
  return value || "General";
}

export function categoryBins(cards: Flashcard[]) {
  const map = new Map<string, Flashcard[]>();
  for (const card of cards) {
    const key = categoryOf(card);
    const list = map.get(key) ?? [];
    list.push(card);
    map.set(key, list);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
}

export function gameshowPoints(card: Flashcard) {
  const words = card.back.trim().split(/\s+/).length;
  if (words >= 12) return 300;
  if (words >= 6) return 200;
  return 100;
}
