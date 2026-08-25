export const PLAY_CATALOG_IDS = ["matching-pairs", "type-the-answer"] as const;

export const PLAY_RETIRED_IDS = [
  "match-up",
  "find-the-match",
  "labelled-diagram",
  "label-match",
  "spell-the-word",
  "unjumble",
  "hangman",
  "complete-the-sentence",
  "crossword",
  "wordsearch",
  "true-or-false",
  "open-the-box",
  "gameshow-quiz",
  "image-quiz",
  "odd-one-out",
  "rank-order",
  "speed-sort",
  "airplane",
  "balloon-pop",
  "speaking-cards",
  "group-sort",
  "win-or-lose",
  "maze-chase",
  "whack-a-mole",
  "gate-dash",
  "last-car",
  "ding-ding",
  "estate-court",
  "mosaic-wall",
  "minibus-stop",
  "station-lost",
  "ticket-chops",
  "street-flyers",
] as const;

export const PLAY_TEMPLATE_IDS = [
  ...PLAY_CATALOG_IDS,
  ...PLAY_RETIRED_IDS,
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
  "true-or-false": "matching-pairs",
  "open-the-box": "matching-pairs",
  "gameshow-quiz": "matching-pairs",
  "odd-one-out": "matching-pairs",
  "rank-order": "matching-pairs",
  "speed-sort": "matching-pairs",
  airplane: "matching-pairs",
  "balloon-pop": "matching-pairs",
  "group-sort": "matching-pairs",
  "win-or-lose": "matching-pairs",
  "maze-chase": "matching-pairs",
  "whack-a-mole": "matching-pairs",
  "gate-dash": "matching-pairs",
  "last-car": "matching-pairs",
  "ding-ding": "matching-pairs",
  "estate-court": "matching-pairs",
  "mosaic-wall": "matching-pairs",
  "minibus-stop": "matching-pairs",
  "station-lost": "matching-pairs",
  "ticket-chops": "matching-pairs",
  "street-flyers": "matching-pairs",
  "spell-the-word": "type-the-answer",
  unjumble: "type-the-answer",
  hangman: "type-the-answer",
  "complete-the-sentence": "type-the-answer",
  crossword: "type-the-answer",
  wordsearch: "type-the-answer",
  "speaking-cards": "type-the-answer",
};

export const PLAY_TEMPLATES: PlayTemplateMeta[] = [
  {
    id: "matching-pairs",
    name: "Matching pairs",
    blurb: "Flip two cards. Pair the prompt with the answer.",
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

export function playTemplateEnum() {
  return PLAY_TEMPLATE_IDS as unknown as [
    PlayTemplateId,
    ...PlayTemplateId[],
  ];
}
