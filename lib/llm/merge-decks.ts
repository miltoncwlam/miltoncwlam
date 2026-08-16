import type { GeneratedDeck, GeneratedFlashcard } from "@/lib/types/flashcard";

function normalizeFront(front: string) {
  return front.toLowerCase().replace(/\s+/g, " ").trim();
}

function frontsSimilar(a: string, b: string) {
  const left = normalizeFront(a);
  const right = normalizeFront(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length) > 0.7;
  }
  return false;
}

export function mergeGeneratedDecks(
  decks: GeneratedDeck[],
  targetCount: number,
  fallbackTitle = "Study deck",
): GeneratedDeck {
  const target = Math.min(30, Math.max(3, targetCount));
  const title =
    decks.find((deck) => deck.title?.trim())?.title.trim().slice(0, 100) ||
    fallbackTitle;

  const merged: GeneratedFlashcard[] = [];
  for (const deck of decks) {
    for (const card of deck.cards) {
      const duplicate = merged.some((existing) =>
        frontsSimilar(existing.front, card.front),
      );
      if (!duplicate) merged.push(card);
    }
  }

  if (merged.length >= target) {
    return { title, cards: merged.slice(0, target) };
  }

  return { title, cards: merged };
}
