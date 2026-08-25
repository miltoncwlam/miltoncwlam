import type { Flashcard } from "@/lib/types/flashcard";

import { chipCards } from "./answers";
import {
  PLAY_TEMPLATES,
  resolvePlayTemplate,
  type PlayCatalogId,
  type PlayTemplateId,
} from "./templates";

export type PlayBlockReason = "needCards" | "needChips" | "needBins";

const CHIP_FLOOR = 4;

export function templateReason(
  id: PlayTemplateId,
  cards: Flashcard[],
): PlayBlockReason | null {
  const resolved = resolvePlayTemplate(id);
  if (!resolved) return "needCards";
  return catalogReason(resolved, cards);
}

export function catalogReason(
  _id: PlayCatalogId,
  cards: Flashcard[],
): PlayBlockReason | null {
  if (cards.length < CHIP_FLOOR) return "needCards";
  const chips = chipCards(cards);
  return chips.length >= CHIP_FLOOR ? null : "needChips";
}

export function templatesForDeck(cards: Flashcard[]) {
  return PLAY_TEMPLATES.map((template) => ({
    ...template,
    blocked: catalogReason(template.id, cards),
  }));
}

export function unlockedCatalogCount(cards: Flashcard[]) {
  return templatesForDeck(cards).filter((item) => !item.blocked).length;
}

export function blockedCopy(reason: PlayBlockReason) {
  switch (reason) {
    case "needChips":
      return "Need 4 short play terms (not essays).";
    case "needBins":
      return "Need two labelled groups with two cards each.";
    default:
      return "Need at least 4 cards.";
  }
}

export function playableTemplateId(value: string): PlayCatalogId | null {
  return resolvePlayTemplate(value);
}
