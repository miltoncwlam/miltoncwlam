export const PLAY_CATALOG_IDS = ["matching-pairs", "type-the-answer"] as const;

export const PLAY_TEMPLATE_IDS = [
  "match-up",
  "matching-pairs",
  "find-the-match",
  "type-the-answer",
  "spell-the-word",
  "unjumble",
  "hangman",
  "complete-the-sentence",
  "true-or-false",
  "open-the-box",
  "group-sort",
  "odd-one-out",
  "rank-order",
  "image-quiz",
  "crossword",
  "wordsearch",
  "gameshow-quiz",
  "win-or-lose",
  "speaking-cards",
  "whack-a-mole",
  "balloon-pop",
  "speed-sort",
  "maze-chase",
  "airplane",
  "labelled-diagram",
  "label-match",
] as const;

export type PlayCatalogId = (typeof PLAY_CATALOG_IDS)[number];
export type PlayTemplateId = (typeof PLAY_TEMPLATE_IDS)[number];

export type PlayTemplateMeta = {
  id: PlayCatalogId;
  name: string;
  blurb: string;
  group: "pairing" | "recall";
};

export const PLAY_ALIASES: Record<string, PlayCatalogId> = {
  "match-up": "matching-pairs",
  "find-the-match": "matching-pairs",
  "labelled-diagram": "matching-pairs",
  "label-match": "matching-pairs",
  "image-quiz": "matching-pairs",
  "spell-the-word": "type-the-answer",
  unjumble: "type-the-answer",
  hangman: "type-the-answer",
  "complete-the-sentence": "type-the-answer",
  crossword: "type-the-answer",
  wordsearch: "type-the-answer",
  "speaking-cards": "type-the-answer",
  "true-or-false": "matching-pairs",
  "open-the-box": "matching-pairs",
  "gameshow-quiz": "matching-pairs",
  "win-or-lose": "matching-pairs",
  "group-sort": "matching-pairs",
  "odd-one-out": "matching-pairs",
  "rank-order": "matching-pairs",
  "whack-a-mole": "matching-pairs",
  "balloon-pop": "matching-pairs",
  "speed-sort": "matching-pairs",
  "maze-chase": "matching-pairs",
  airplane: "matching-pairs",
};

export const PLAY_TEMPLATES: PlayTemplateMeta[] = [
  {
    id: "matching-pairs",
    name: "Matching pairs",
    blurb: "Flip two tiles. Pair prompt with answer.",
    group: "pairing",
  },
  {
    id: "type-the-answer",
    name: "Type the answer",
    blurb: "Read the prompt and type the answer.",
    group: "recall",
  },
];

export function isPlayCatalogId(value: string): value is PlayCatalogId {
  return (PLAY_CATALOG_IDS as readonly string[]).includes(value);
}

export function isPlayTemplateId(value: string): value is PlayTemplateId {
  return (PLAY_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function resolvePlayTemplate(value: string): PlayCatalogId | null {
  if (isPlayCatalogId(value)) return value;
  return PLAY_ALIASES[value] ?? null;
}
