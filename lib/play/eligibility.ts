import type { Flashcard } from "@/lib/types/flashcard";

import { shortTarget } from "./answers";
import {
  PLAY_TEMPLATES,
  resolvePlayTemplate,
  type PlayCatalogId,
  type PlayTemplateId,
} from "./templates";

export function templateReason(
  id: PlayTemplateId,
  cards: Flashcard[],
): string | null {
  const resolved = resolvePlayTemplate(id);
  if (!resolved) return "This activity is not available.";
  return catalogReason(resolved, cards);
}

export function catalogReason(id: PlayCatalogId, cards: Flashcard[]): string | null {
  if (cards.length < 4) return "Need at least 4 cards.";
  if (id === "type-the-answer") {
    const short = cards.filter((card) => shortTarget(card));
    return short.length >= 4 ? null : "Need 4 short answers to type.";
  }
  return null;
}

export function templatesForDeck(cards: Flashcard[]) {
  return PLAY_TEMPLATES.map((template) => ({
    ...template,
    blocked: catalogReason(template.id, cards),
  }));
}
