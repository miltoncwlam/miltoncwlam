import type { GeneratedFlashcard } from "@/lib/types/flashcard";
import { shuffleIds } from "@/lib/study/shuffle";

export type QuizChoiceCard = {
  id?: string;
  front: string;
  back: string;
  hint?: string | null;
  category?: string | null;
  cardType?: string | null;
  options?: string[] | null;
};

export type AnswerKind = "number" | "definition" | "name";

export function normalizeAnswer(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.。!！?？]+$/g, "")
    .replace(/\s+/g, " ");
}

export function answersMatch(a: string, b: string) {
  return normalizeAnswer(a) === normalizeAnswer(b);
}

export function answerKind(text: string): AnswerKind {
  const value = text.trim();
  if (!value) return "name";
  if (
    /^-?\d/.test(value) ||
    /^\d+(\.\d+)?%/.test(value) ||
    /^\d+(\.\d+)?°/.test(value) ||
    /\b\d+\s*(hours?|years?|days?|cm|m²|km|square)\b/i.test(value)
  ) {
    return "number";
  }
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= 6) return "definition";
  if (
    /^(it |they |this |that |how |to |liquid |fresh |land |water )/i.test(value)
  ) {
    return "definition";
  }
  return "name";
}

export function questionFamily(front: string): string {
  const f = front.toLowerCase();
  if (/which continent/.test(f)) return "which-continent";
  if (/which planet/.test(f)) return "which-planet";
  if (/which ocean/.test(f)) return "which-ocean";
  if (/which organ|what organ/.test(f)) return "which-organ";
  if (/what is a |what is an |what is the |what is /.test(f)) return "what-is";
  if (/what does |what do /.test(f)) return "what-does";
  if (/why /.test(f)) return "why";
  if (/where /.test(f)) return "where";
  if (/how many|how much/.test(f)) return "how-many";
  if (/name a |name one |name /.test(f)) return "name";
  return f
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
}

function similarLength(a: string, b: string) {
  const ratio = Math.max(a.length, 1) / Math.max(b.length, 1);
  return ratio >= 0.45 && ratio <= 2.2;
}

/** True when text is a "why" paragraph rather than a tap-able choice. */
function isShortChoice(text: string) {
  const value = text.trim();
  if (!value || value.length > 72) return false;
  return value.split(/\s+/).filter(Boolean).length <= 6;
}

function appearsIn(haystack: string, needle: string) {
  const h = normalizeAnswer(haystack);
  const n = normalizeAnswer(needle);
  if (!n || n.length < 2) return false;
  if (h === n) return true;
  return (
    h.startsWith(`${n} `) ||
    h.includes(` ${n} `) ||
    h.includes(` ${n},`) ||
    h.endsWith(` ${n}`)
  );
}

export function isExplanationText(text: string, options: string[] = []) {
  const value = text.trim();
  if (!value) return false;
  const shorts = options
    .map((entry) => entry.trim())
    .filter((entry) => entry && !answersMatch(entry, value) && isShortChoice(entry));
  const words = value.split(/\s+/).filter(Boolean).length;
  if (shorts.length && words >= 8) return true;
  if (
    shorts.some(
      (option) =>
        appearsIn(value, option) && value.length > option.length * 1.5,
    )
  ) {
    return true;
  }
  if (shorts.length && value.length >= 70) {
    const longestShort = Math.max(...shorts.map((entry) => entry.length));
    if (value.length > longestShort * 1.8) return true;
  }
  return !isShortChoice(value) && words >= 10;
}

/** Short tap-able correct choice — never a long explanation. */
export function resolveCorrectChoice(card: QuizChoiceCard): string {
  const options = (card.options ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);
  const back = card.back.trim();
  if (!options.length) return back;

  const exactShort = options.find(
    (entry) => answersMatch(entry, back) && isShortChoice(entry),
  );
  if (exactShort) return exactShort;

  const backLower = back.toLowerCase();
  const prefixHits = options
    .filter(
      (option) =>
        option.length < back.length &&
        backLower.startsWith(option.toLowerCase()),
    )
    .sort((a, b) => b.length - a.length);
  if (prefixHits[0]) return prefixHits[0];

  const containedHits = options
    .filter(isShortChoice)
    .filter((option) => appearsIn(back, option))
    .sort((a, b) => b.length - a.length);
  if (containedHits[0]) return containedHits[0];

  const shorts = options.filter(isShortChoice);
  if (isExplanationText(back, options) && shorts[0]) return shorts[0];
  return back;
}

function uniqueAnswers(values: string[], exclude: string[] = []) {
  const seen = new Set(exclude.map(normalizeAnswer).filter(Boolean));
  const unique: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = normalizeAnswer(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }
  return unique;
}

function containsAnswer(option: string, correct: string) {
  const optionKey = normalizeAnswer(option);
  const correctKey = normalizeAnswer(correct);
  if (!optionKey || !correctKey || optionKey === correctKey) return false;
  return optionKey.includes(correctKey) && option.length > correct.trim().length;
}

/** Extra fact to show after the learner picks — hint, or a longer back. */
export function quizExplanation(card: QuizChoiceCard): string | null {
  const correct = resolveCorrectChoice(card);
  const hint = card.hint?.trim();
  if (hint && !answersMatch(hint, correct)) return hint;
  const back = card.back.trim();
  if (back && !answersMatch(back, correct)) return back;
  return null;
}

function distractorScore(card: QuizChoiceCard, candidate: QuizChoiceCard) {
  const correct = resolveCorrectChoice(card);
  const candidateText = candidate.back.trim();
  const kind = answerKind(correct);
  const otherKind = answerKind(candidateText);
  let score = 0;
  if (otherKind === kind) score += 8;
  else score -= 24;
  if (
    card.category &&
    candidate.category &&
    card.category.trim().toLowerCase() ===
      candidate.category.trim().toLowerCase()
  ) {
    score += 5;
  }
  if (questionFamily(card.front) === questionFamily(candidate.front)) {
    score += 8;
  }
  if (similarLength(correct, candidateText)) score += 2;
  else score -= 4;
  if (isExplanationText(candidateText, [correct])) score -= 12;
  return score;
}

/** Rank plausible wrong answers from sibling cards. Never mixes names with definitions. */
export function selectQuizDistractors(
  card: QuizChoiceCard,
  deckCards: QuizChoiceCard[],
  count = 3,
): string[] {
  const correct = resolveCorrectChoice(card);
  const selfKey = card.id ?? `front:${normalizeAnswer(card.front)}`;
  const ranked = deckCards
    .filter(
      (entry) =>
        (entry.id ?? `front:${normalizeAnswer(entry.front)}`) !== selfKey,
    )
    .map((entry) => ({
      score: distractorScore(card, entry),
      back: entry.back.trim(),
    }))
    .filter(
      (row) =>
        row.back &&
        !answersMatch(row.back, correct) &&
        !containsAnswer(row.back, correct) &&
        !isExplanationText(row.back, [correct]),
    );

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.back.localeCompare(b.back);
  });

  const preferred = ranked.filter((row) => row.score >= 6).map((row) => row.back);
  const sameKind = ranked
    .filter((row) => answerKind(row.back) === answerKind(correct))
    .map((row) => row.back);
  return uniqueAnswers([...preferred, ...sameKind], [correct]).slice(0, count);
}

function filterChoicePool(options: string[], correct: string) {
  const kind = answerKind(correct);
  return uniqueAnswers(options, [])
    .filter((entry) => {
      if (answersMatch(entry, correct)) return true;
      if (isExplanationText(entry, options)) return false;
      if (containsAnswer(entry, correct)) return false;
      if (answerKind(entry) !== kind) return false;
      return similarLength(correct, entry);
    });
}

function choicesFromAuthoredOptions(card: QuizChoiceCard): string[] | null {
  const authored = (card.options ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (authored.length < 2) return null;
  const correct = resolveCorrectChoice(card);
  const pool = filterChoicePool([...authored, correct], correct);
  if (!pool.some((entry) => answersMatch(entry, correct))) {
    pool.unshift(correct);
  }
  const rest = pool.filter((entry) => !answersMatch(entry, correct));
  const choices = [correct, ...rest];
  if (choices.length < 2) return null;
  return choices.slice(0, 4);
}

/** Build up to 4 same-kind choices. Never injects a long explanation as an option. */
export function buildQuizChoices(
  card: QuizChoiceCard,
  deckCards: QuizChoiceCard[],
  random: () => number = Math.random,
): string[] {
  const authored = choicesFromAuthoredOptions(card);
  const correct = resolveCorrectChoice(card);
  let choices = authored ? [...authored] : [correct];
  if (choices.length < 4) {
    const extra = selectQuizDistractors(card, deckCards, 4 - (choices.length - 1));
    choices = uniqueAnswers([...choices, ...extra], []);
  }
  const filtered = filterChoicePool(choices, correct);
  const withCorrect = filtered.some((entry) => answersMatch(entry, correct))
    ? filtered
    : [correct, ...filtered];
  const finalChoices = uniqueAnswers(withCorrect, []).slice(0, 4);
  if (finalChoices.length < 2) return shuffleIds([correct, "Not sure"], random);
  return shuffleIds(finalChoices, random);
}

/**
 * Keep extra fact on hint and short correct text on back when the model stuffed
 * "why" into back or options.
 */
export function sanitizeMcqFields(card: {
  back: string;
  hint?: string;
  options?: string[];
}): { back: string; hint?: string; options?: string[] } {
  const options = (card.options ?? []).map((entry) => entry.trim()).filter(Boolean);
  if (options.length < 2) {
    return { back: card.back.trim(), hint: card.hint?.trim() || undefined, options: card.options };
  }
  const resolved = resolveCorrectChoice({
    front: "",
    back: card.back,
    hint: card.hint,
    options,
  });
  const explanation =
    quizExplanation({
      front: "",
      back: card.back,
      hint: card.hint,
      options,
    }) ?? undefined;
  const cleaned = filterChoicePool([...options, resolved], resolved);
  const withCorrect = cleaned.some((entry) => answersMatch(entry, resolved))
    ? cleaned
    : [resolved, ...cleaned];
  return {
    back: resolved,
    hint: explanation,
    options: uniqueAnswers(withCorrect, []).slice(0, 4),
  };
}

/** Stamp sibling-based options onto a pack; keep Q&A type for study flip cards. */
export function attachQuizOptions(
  cards: GeneratedFlashcard[],
): GeneratedFlashcard[] {
  return cards.map((card) => {
    if ((card.options?.length ?? 0) >= 2) {
      const sanitized = sanitizeMcqFields(card);
      return { ...card, ...sanitized };
    }
    const pool: QuizChoiceCard[] = cards.map((entry) => ({
      front: entry.front,
      back: entry.back,
      hint: entry.hint,
      category: entry.category,
      cardType: entry.type,
      options: entry.options,
    }));
    const distractors = selectQuizDistractors(
      {
        front: card.front,
        back: card.back,
        hint: card.hint,
        category: card.category,
        cardType: card.type,
      },
      pool,
      3,
    );
    if (distractors.length < 2) return card;
    return {
      ...card,
      options: [card.back, ...distractors].slice(0, 4),
    };
  });
}
