import type { PlayTemplateId } from "@/lib/play/templates";

export type PlaySkin =
  | "match"
  | "flip"
  | "mole"
  | "balloon"
  | "chest"
  | "maze"
  | "plane"
  | "neon"
  | "arena"
  | "gallery"
  | "sort"
  | "spell"
  | "puzzle"
  | "talk"
  | "arcade";

export const PLAY_SKINS: Record<PlayTemplateId, PlaySkin> = {
  "match-up": "match",
  "matching-pairs": "flip",
  "find-the-match": "match",
  "type-the-answer": "spell",
  "spell-the-word": "spell",
  unjumble: "spell",
  hangman: "spell",
  "complete-the-sentence": "spell",
  "true-or-false": "arena",
  "open-the-box": "chest",
  "group-sort": "sort",
  "odd-one-out": "sort",
  "rank-order": "sort",
  "image-quiz": "gallery",
  crossword: "puzzle",
  wordsearch: "puzzle",
  "gameshow-quiz": "neon",
  "win-or-lose": "arena",
  "speaking-cards": "talk",
  "whack-a-mole": "mole",
  "balloon-pop": "balloon",
  "speed-sort": "sort",
  "maze-chase": "maze",
  airplane: "plane",
  "labelled-diagram": "gallery",
  "label-match": "gallery",
};

export const PLAY_SKIN_EMOJI: Record<PlaySkin, string> = {
  match: "🔗",
  flip: "🃏",
  mole: "🐹",
  balloon: "🎈",
  chest: "📦",
  maze: "🌀",
  plane: "✈️",
  neon: "🎤",
  arena: "⚔️",
  gallery: "🖼️",
  sort: "🧩",
  spell: "✍️",
  puzzle: "🔠",
  talk: "🗣️",
  arcade: "🎮",
};
