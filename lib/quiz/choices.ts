import type { Flashcard } from "@/lib/types/flashcard";
import { shuffleIds } from "@/lib/study/shuffle";

/** Build 4 choices for quiz mode from MCQ options or distractors. */
export function buildQuizChoices(
  card: Flashcard,
  deckCards: Flashcard[],
): string[] {
  if (card.cardType === "mcq" && card.options && card.options.length >= 2) {
    const options = [...card.options];
    if (!options.some((entry) => entry.trim() === card.back.trim())) {
      options[0] = card.back;
    }
    return shuffleIds(options).slice(0, 4);
  }

  const distractors = deckCards
    .filter((entry) => entry.id !== card.id)
    .map((entry) => entry.back)
    .filter((back) => back.trim() && back.trim() !== card.back.trim());

  const unique = [...new Set(distractors)];
  while (unique.length < 3) {
    unique.push(`Option ${unique.length + 1}`);
  }

  return shuffleIds([card.back, ...unique.slice(0, 3)]);
}
