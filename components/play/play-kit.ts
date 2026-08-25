import { playChip, promptText, shortTarget } from "@/lib/play/answers";
import { PLAY_TERM_MAX_CHARS } from "@/lib/play/term";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

export function takeChips(cards: Flashcard[], max = 12) {
  return shuffleList(cards.filter((card) => playChip(card))).slice(
    0,
    Math.min(max, cards.length),
  );
}

export function decoysFor(card: Flashcard, pool: Flashcard[], n = 3) {
  return shuffleList(pool.filter((item) => item.id !== card.id)).slice(0, n);
}

export function mixWithDecoys(card: Flashcard, pool: Flashcard[], n = 3) {
  return shuffleList([card, ...decoysFor(card, pool, n)]);
}

function clipMiss(value: string) {
  const text = value.trim();
  if (text.length <= PLAY_TERM_MAX_CHARS) return text;
  return `${text.slice(0, PLAY_TERM_MAX_CHARS - 1).trim()}…`;
}

export function missWhy(card: Flashcard) {
  return playChip(card) ?? shortTarget(card) ?? clipMiss(card.back);
}

export function promptOf(card: Flashcard) {
  return promptText(card);
}

export function chipOf(card: Flashcard) {
  return playChip(card) ?? card.back;
}
