import type { Flashcard } from "@/lib/types/flashcard";

import { categoryBins, clozeBlank, shortTarget, spellingWord } from "./answers";
import { buildCrossword, buildWordsearch } from "./puzzles";
import { PLAY_TEMPLATES, type PlayTemplateId } from "./templates";

export function templateReason(
  id: PlayTemplateId,
  cards: Flashcard[],
): string | null {
  const n = cards.length;
  if (n < 4) return "Need at least 4 cards.";

  const short = cards.filter((card) => shortTarget(card));
  const spell = cards.filter((card) => spellingWord(card));
  const images = cards.filter((card) => card.imageUrl);
  const bins = categoryBins(cards);
  const cloze = cards.filter((card) => clozeBlank(card));

  switch (id) {
    case "match-up":
    case "matching-pairs":
    case "find-the-match":
    case "true-or-false":
    case "open-the-box":
    case "gameshow-quiz":
    case "win-or-lose":
    case "speaking-cards":
    case "whack-a-mole":
    case "balloon-pop":
    case "rank-order":
    case "maze-chase":
    case "airplane":
      return null;
    case "type-the-answer":
      return short.length >= 4 ? null : "Need 4 short answers to type.";
    case "spell-the-word":
    case "unjumble":
    case "hangman":
      return spell.length >= 4 ? null : "Need 4 short letter-answers (3–14 letters).";
    case "complete-the-sentence":
      return cloze.length >= 4 ? null : "Need 4 sentence-style cards to blank.";
    case "group-sort":
    case "speed-sort":
      return bins.length >= 2
        ? null
        : "Need at least two categories with two cards each.";
    case "odd-one-out":
      return bins.length >= 2 && n >= 8
        ? null
        : "Need 8+ cards across two categories.";
    case "image-quiz":
    case "labelled-diagram":
    case "label-match":
      return images.length >= 4 ? null : "Need 4 cards with pictures.";
    case "crossword":
      return buildCrossword(cards) ? null : "Need more short answers that share letters.";
    case "wordsearch":
      return buildWordsearch(cards) ? null : "Need 4 short letter-answers.";
    default:
      return "This activity is not available.";
  }
}

export function templatesForDeck(cards: Flashcard[]) {
  return PLAY_TEMPLATES.map((template) => ({
    ...template,
    blocked: templateReason(template.id, cards),
  }));
}
