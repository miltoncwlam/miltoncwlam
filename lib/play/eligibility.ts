import type { Flashcard } from "@/lib/types/flashcard";

import { categoryBins, chipCards } from "./answers";
import {
  PLAY_TEMPLATES,
  isPlayCatalogId,
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
  if (!resolved || resolved === "study") return "needCards";
  return catalogReason(resolved, cards);
}

export function catalogReason(
  id: PlayCatalogId,
  cards: Flashcard[],
): PlayBlockReason | null {
  if (cards.length < CHIP_FLOOR) return "needCards";
  const chips = chipCards(cards);
  if (id === "group-sort") {
    return categoryBins(cards).length >= 2 ? null : "needBins";
  }
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

export function playableTemplateId(
  value: string,
): PlayCatalogId | "study" | null {
  if (!isPlayCatalogId(value) && resolvePlayTemplate(value) == null) {
    return null;
  }
  return resolvePlayTemplate(value);
}
