import { playChip, promptText } from "@/lib/play/answers";
import { quizExplanation } from "@/lib/quiz/choices";
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

export function missWhy(card: Flashcard) {
  const chip = playChip(card) ?? card.back;
  const hint = quizExplanation(card) ?? card.hint;
  return hint ? `${chip} — ${hint}` : chip;
}

export function promptOf(card: Flashcard) {
  return promptText(card);
}

export function chipOf(card: Flashcard) {
  return playChip(card) ?? card.back;
}
