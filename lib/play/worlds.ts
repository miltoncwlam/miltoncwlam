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
  "matching-pairs": "flip",
  "type-the-answer": "spell",
  "group-sort": "sort",
  "win-or-lose": "arena",
  "maze-chase": "maze",
  "whack-a-mole": "mole",
  "gate-dash": "plane",
  "last-car": "arcade",
  "ding-ding": "neon",
  "estate-court": "match",
  "mosaic-wall": "puzzle",
  "minibus-stop": "balloon",
  "station-lost": "gallery",
  "ticket-chops": "chest",
  "street-flyers": "arcade",
  "match-up": "flip",
  "find-the-match": "flip",
  "labelled-diagram": "flip",
  "label-match": "flip",
  "spell-the-word": "spell",
  unjumble: "spell",
  hangman: "spell",
  "complete-the-sentence": "spell",
  crossword: "spell",
  wordsearch: "spell",
  "true-or-false": "arena",
  "open-the-box": "arena",
  "gameshow-quiz": "arena",
  "image-quiz": "arena",
  "odd-one-out": "sort",
  "rank-order": "sort",
  "speed-sort": "sort",
  airplane: "plane",
  "balloon-pop": "arcade",
  "speaking-cards": "talk",
};

export const PLAY_SKIN_EMOJI: Record<PlaySkin, string> = {
  match: "📰",
  flip: "🃏",
  mole: "🪑",
  balloon: "🚐",
  chest: "🎫",
  maze: "🚪",
  plane: "🌉",
  neon: "🔔",
  arena: "📝",
  gallery: "🧳",
  sort: "📂",
  spell: "⌨️",
  puzzle: "🧱",
  talk: "🗣️",
  arcade: "🌃",
};
