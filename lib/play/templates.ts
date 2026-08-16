export const PLAY_CATALOG_IDS = [
  "matching-pairs",
  "type-the-answer",
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
  group: "city" | "campus";
};

export const PLAY_ALIASES: Record<string, PlayCatalogId> = {
  "match-up": "matching-pairs",
  "find-the-match": "matching-pairs",
  "labelled-diagram": "matching-pairs",
  "label-match": "matching-pairs",
  "spell-the-word": "type-the-answer",
  unjumble: "type-the-answer",
  hangman: "type-the-answer",
  "complete-the-sentence": "type-the-answer",
  crossword: "type-the-answer",
  wordsearch: "type-the-answer",
  "true-or-false": "win-or-lose",
  "open-the-box": "win-or-lose",
  "gameshow-quiz": "win-or-lose",
  "image-quiz": "win-or-lose",
  "odd-one-out": "group-sort",
  "rank-order": "group-sort",
  "speed-sort": "group-sort",
  airplane: "gate-dash",
  "balloon-pop": "street-flyers",
};

export const PLAY_TEMPLATES: PlayTemplateMeta[] = [
  {
    id: "matching-pairs",
    name: "Twin lanterns",
    blurb: "Pair Mid-Autumn lanterns on the harbourfront.",
    group: "city",
  },
  {
    id: "type-the-answer",
    name: "Ink well",
    blurb: "Write the term before the 揮春 ink dries.",
    group: "city",
  },
  {
    id: "gate-dash",
    name: "Gate dash",
    blurb: "Paper-plane a covered footbridge. Tap a sign to fly the plane into that gate.",
    group: "city",
  },
  {
    id: "last-car",
    name: "Last car",
    blurb: "Last train of the night. Board the matching door, duck the rest.",
    group: "city",
  },
  {
    id: "ding-ding",
    name: "Ding ding",
    blurb: "Tap when the matching tram-bell chip crosses the strike line.",
    group: "city",
  },
  {
    id: "estate-court",
    name: "Estate court",
    blurb: "Sitting-out area. Right cards orbit as 新聞紙 and auto-clear matches.",
    group: "city",
  },
  {
    id: "mosaic-wall",
    name: "Mosaic wall",
    blurb: "Cha chaan teng 花磚. Break the matching tile with a milk-tea paddle.",
    group: "city",
  },
  {
    id: "minibus-stop",
    name: "Minibus stop",
    blurb: "Tap Board when the matching-chip van lines up with the pole.",
    group: "city",
  },
  {
    id: "station-lost",
    name: "Station lost property",
    blurb: "Claim ticket in hand. Tap the matching bag in the jumble.",
    group: "city",
  },
  {
    id: "ticket-chops",
    name: "Ticket chops",
    blurb: "Chop if the stub matches. Pass a decoy.",
    group: "city",
  },
  {
    id: "street-flyers",
    name: "Street flyers",
    blurb: "Slash only the matching 街招. Penalty notices cost a life.",
    group: "city",
  },
  {
    id: "group-sort",
    name: "Homework trays",
    blurb: "Flick papers into labelled classroom trays.",
    group: "campus",
  },
  {
    id: "win-or-lose",
    name: "Detention hall",
    blurb: "Three late slips. Streak of facts, not a gameshow.",
    group: "campus",
  },
  {
    id: "maze-chase",
    name: "Prefect’s corridor",
    blurb: "Late for assembly. Four coloured doors. Avoid the prefect.",
    group: "campus",
  },
  {
    id: "whack-a-mole",
    name: "Pop-quiz desks",
    blurb: "Only a standing student is hittable. Chips hide when seated.",
    group: "campus",
  },
];

export function isPlayCatalogId(value: string): value is PlayCatalogId {
  return (PLAY_CATALOG_IDS as readonly string[]).includes(value);
}

export function isPlayTemplateId(value: string): value is PlayTemplateId {
  return (PLAY_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function resolvePlayTemplate(
  value: string,
): PlayCatalogId | "study" | null {
  if (value === "speaking-cards") return "study";
  if (isPlayCatalogId(value)) return value;
  return PLAY_ALIASES[value] ?? null;
}

export function playTemplateEnum() {
  return PLAY_TEMPLATE_IDS as unknown as [
    PlayTemplateId,
    ...PlayTemplateId[],
  ];
}
