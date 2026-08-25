export const PLAY_LOCAL_CATALOG_IDS = [
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

export const PLAY_PUBLIC_CATALOG_IDS = [
  "matching-pairs",
  "type-the-answer",
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
  ...PLAY_LOCAL_CATALOG_IDS,
  ...PLAY_RETIRED_IDS,
] as const;

export type PlayCatalogId = (typeof PLAY_LOCAL_CATALOG_IDS)[number];
export type PlayTemplateId = (typeof PLAY_TEMPLATE_IDS)[number];

export type PlayTemplateMeta = {
  id: PlayCatalogId;
  name: string;
  blurb: string;
  group: "city" | "campus" | "pairing" | "recall";
};

/** Vercel sets this on production and preview. Local `next dev` leaves it unset. */
export function isPublicPlayCatalog() {
  return Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);
}

export function playCatalogIds(publicOnly = isPublicPlayCatalog()) {
  return publicOnly ? PLAY_PUBLIC_CATALOG_IDS : PLAY_LOCAL_CATALOG_IDS;
}

export const PLAY_CATALOG_IDS = playCatalogIds();

const LOCAL_ALIASES: Record<string, PlayCatalogId> = {
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

const PUBLIC_ROOM_ALIASES: Record<string, PlayCatalogId> = {
  ...LOCAL_ALIASES,
  "speaking-cards": "type-the-answer",
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
  airplane: "matching-pairs",
  "balloon-pop": "matching-pairs",
  "true-or-false": "matching-pairs",
  "open-the-box": "matching-pairs",
  "gameshow-quiz": "matching-pairs",
  "image-quiz": "matching-pairs",
  "odd-one-out": "matching-pairs",
  "rank-order": "matching-pairs",
  "speed-sort": "matching-pairs",
};

export const PLAY_ALIASES = LOCAL_ALIASES;

function collapsePublic(id: PlayCatalogId): PlayCatalogId {
  return (PLAY_PUBLIC_CATALOG_IDS as readonly string[]).includes(id)
    ? id
    : (PUBLIC_ROOM_ALIASES[id] ?? "matching-pairs");
}

const LOCAL_TEMPLATES: PlayTemplateMeta[] = [
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

export const PLAY_TEMPLATES: PlayTemplateMeta[] = isPublicPlayCatalog()
  ? LOCAL_TEMPLATES.filter((item) =>
      (PLAY_PUBLIC_CATALOG_IDS as readonly string[]).includes(item.id),
    )
  : LOCAL_TEMPLATES;

export function isPlayCatalogId(value: string): value is PlayCatalogId {
  return (PLAY_CATALOG_IDS as readonly string[]).includes(value);
}

export function isPlayTemplateId(value: string): value is PlayTemplateId {
  return (PLAY_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function resolvePlayTemplate(
  value: string,
  publicOnly = isPublicPlayCatalog(),
): PlayCatalogId | "study" | null {
  if (!publicOnly && value === "speaking-cards") return "study";
  if ((playCatalogIds(publicOnly) as readonly string[]).includes(value)) {
    return value as PlayCatalogId;
  }
  if (publicOnly) {
    if (PUBLIC_ROOM_ALIASES[value]) return PUBLIC_ROOM_ALIASES[value]!;
    if ((PLAY_LOCAL_CATALOG_IDS as readonly string[]).includes(value)) {
      return collapsePublic(value as PlayCatalogId);
    }
    return null;
  }
  return LOCAL_ALIASES[value] ?? null;
}

export function playTemplateEnum() {
  return PLAY_TEMPLATE_IDS as unknown as [
    PlayTemplateId,
    ...PlayTemplateId[],
  ];
}
