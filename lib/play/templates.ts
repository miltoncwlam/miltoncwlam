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

export type PlayTemplateId = (typeof PLAY_TEMPLATE_IDS)[number];

export type PlayTemplateMeta = {
  id: PlayTemplateId;
  name: string;
  blurb: string;
  group: "pairing" | "recall" | "classify" | "picture" | "quiz" | "puzzle" | "arcade";
};

export const PLAY_TEMPLATES: PlayTemplateMeta[] = [
  {
    id: "match-up",
    name: "Match up",
    blurb: "Tap a term, then its definition.",
    group: "pairing",
  },
  {
    id: "matching-pairs",
    name: "Matching pairs",
    blurb: "Flip two tiles. Pair prompt with answer.",
    group: "pairing",
  },
  {
    id: "find-the-match",
    name: "Find the match",
    blurb: "Tap the matching answer until the bank is empty.",
    group: "pairing",
  },
  {
    id: "type-the-answer",
    name: "Type the answer",
    blurb: "Read the prompt and type the answer.",
    group: "recall",
  },
  {
    id: "spell-the-word",
    name: "Spell the word",
    blurb: "Build a short answer from letter tiles.",
    group: "recall",
  },
  {
    id: "unjumble",
    name: "Unjumble",
    blurb: "Unscramble the letters of a short answer.",
    group: "recall",
  },
  {
    id: "hangman",
    name: "Hangman",
    blurb: "Guess letters of a short answer. Six misses.",
    group: "recall",
  },
  {
    id: "complete-the-sentence",
    name: "Complete the sentence",
    blurb: "Pick the missing word from a chip bank.",
    group: "recall",
  },
  {
    id: "true-or-false",
    name: "True or false",
    blurb: "Is this pairing real, or swapped from another card?",
    group: "quiz",
  },
  {
    id: "open-the-box",
    name: "Open the box",
    blurb: "Pick a box, then answer the card inside.",
    group: "quiz",
  },
  {
    id: "group-sort",
    name: "Group sort",
    blurb: "Sort each card into its category bin.",
    group: "classify",
  },
  {
    id: "odd-one-out",
    name: "Odd one out",
    blurb: "Three belong together. Tap the one that does not.",
    group: "classify",
  },
  {
    id: "rank-order",
    name: "Rank order",
    blurb: "Put cards in the deck’s study order.",
    group: "classify",
  },
  {
    id: "image-quiz",
    name: "Image quiz",
    blurb: "Look at the picture. Choose the matching name.",
    group: "picture",
  },
  {
    id: "crossword",
    name: "Crossword",
    blurb: "Fill short answers from the clues.",
    group: "puzzle",
  },
  {
    id: "wordsearch",
    name: "Wordsearch",
    blurb: "Find short answers hidden in the grid.",
    group: "puzzle",
  },
  {
    id: "gameshow-quiz",
    name: "Gameshow quiz",
    blurb: "Multiple choice with 100 / 200 / 300 points.",
    group: "quiz",
  },
  {
    id: "win-or-lose",
    name: "Win or lose quiz",
    blurb: "Three lives. Miss three and the run ends.",
    group: "quiz",
  },
  {
    id: "speaking-cards",
    name: "Speaking cards",
    blurb: "Say the answer aloud, then check yourself.",
    group: "recall",
  },
  {
    id: "whack-a-mole",
    name: "Whack-a-mole",
    blurb: "Tap the mole with the correct answer.",
    group: "arcade",
  },
  {
    id: "balloon-pop",
    name: "Balloon pop",
    blurb: "Pop the balloon that matches the prompt.",
    group: "arcade",
  },
  {
    id: "speed-sort",
    name: "Speed sorting",
    blurb: "Group sort against a 60-second clock.",
    group: "arcade",
  },
  {
    id: "maze-chase",
    name: "Maze chase",
    blurb: "Steer to the correct exit. Avoid the chaser.",
    group: "arcade",
  },
  {
    id: "airplane",
    name: "Airplane",
    blurb: "Fly into the cloud with the right answer.",
    group: "arcade",
  },
  {
    id: "labelled-diagram",
    name: "Labelled diagram",
    blurb: "Match each picture on the diagram to its label.",
    group: "picture",
  },
  {
    id: "label-match",
    name: "Label match",
    blurb: "Drag-tap labels onto the matching pictures.",
    group: "picture",
  },
];

export function isPlayTemplateId(value: string): value is PlayTemplateId {
  return (PLAY_TEMPLATE_IDS as readonly string[]).includes(value);
}
