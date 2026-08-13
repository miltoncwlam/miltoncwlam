import type { Flashcard } from "@/lib/types/flashcard";

import { promptText, spellingWord } from "./answers";

export type CrosswordEntry = {
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: "across" | "down";
  number: number;
};

export type CrosswordPuzzle = {
  width: number;
  height: number;
  grid: (string | null)[][];
  entries: CrosswordEntry[];
};

export type WordsearchPuzzle = {
  size: number;
  grid: string[][];
  words: { word: string; clue: string }[];
};

type Candidate = { word: string; clue: string };

function candidates(cards: Flashcard[]): Candidate[] {
  const seen = new Set<string>();
  const list: Candidate[] = [];
  for (const card of cards) {
    const word = spellingWord(card);
    if (!word || seen.has(word)) continue;
    seen.add(word);
    list.push({ word, clue: promptText(card) });
  }
  return list.sort((a, b) => b.word.length - a.word.length).slice(0, 10);
}

function emptyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: "across" | "down",
) {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  const size = grid.length;
  if (row < 0 || col < 0) return false;
  if (row + dr * (word.length - 1) >= size) return false;
  if (col + dc * (word.length - 1) >= size) return false;
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r]?.[c];
    if (existing && existing !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: "across" | "down",
) {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i += 1) {
    grid[row + dr * i]![col + dc * i] = word[i]!;
  }
}

export function buildCrossword(cards: Flashcard[]): CrosswordPuzzle | null {
  const words = candidates(cards);
  if (words.length < 4) return null;

  const size = Math.min(18, Math.max(10, words[0]!.word.length + 6));
  const grid = emptyGrid(size);
  const entries: CrosswordEntry[] = [];
  const first = words[0]!;
  const startCol = Math.max(0, Math.floor((size - first.word.length) / 2));
  const startRow = Math.floor(size / 2);
  placeWord(grid, first.word, startRow, startCol, "across");
  entries.push({
    word: first.word,
    clue: first.clue,
    row: startRow,
    col: startCol,
    dir: "across",
    number: 1,
  });

  for (const next of words.slice(1)) {
    let placed = false;
    for (const existing of entries) {
      for (let i = 0; i < existing.word.length; i += 1) {
        const letter = existing.word[i]!;
        for (let j = 0; j < next.word.length; j += 1) {
          if (next.word[j] !== letter) continue;
          const dir = existing.dir === "across" ? "down" : "across";
          const row =
            dir === "down"
              ? existing.row - j
              : existing.row + (existing.dir === "down" ? i : 0);
          const col =
            dir === "across"
              ? existing.col - j
              : existing.col + (existing.dir === "across" ? i : 0);
          if (!canPlace(grid, next.word, row, col, dir)) continue;
          placeWord(grid, next.word, row, col, dir);
          entries.push({
            word: next.word,
            clue: next.clue,
            row,
            col,
            dir,
            number: entries.length + 1,
          });
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (placed) break;
    }
  }

  if (entries.length < 4) {
    let row = 0;
    for (const next of words) {
      if (entries.some((entry) => entry.word === next.word)) continue;
      while (row < size && grid[row]!.some(Boolean)) row += 1;
      if (row >= size || next.word.length > size) continue;
      placeWord(grid, next.word, row, 0, "across");
      entries.push({
        word: next.word,
        clue: next.clue,
        row,
        col: 0,
        dir: "across",
        number: entries.length + 1,
      });
      row += 2;
    }
  }

  if (entries.length < 4) return null;
  return { width: size, height: size, grid, entries };
}

function rngFrom(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return ((hash >>> 0) % 100000) / 100000;
  };
}

export function buildWordsearch(cards: Flashcard[]): WordsearchPuzzle | null {
  const words = candidates(cards).slice(0, 8);
  if (words.length < 4) return null;
  const size = Math.max(10, Math.min(14, (words[0]?.word.length ?? 8) + 6));
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ""),
  );
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
  ] as const;
  const random = rngFrom(words.map((item) => item.word).join("-"));

  for (const item of words) {
    let placed = false;
    for (let attempt = 0; attempt < 120 && !placed; attempt += 1) {
      const [dr, dc] = dirs[attempt % dirs.length]!;
      const row = Math.floor(random() * size);
      const col = Math.floor(random() * size);
      const endR = row + dr * (item.word.length - 1);
      const endC = col + dc * (item.word.length - 1);
      if (endR >= size || endC >= size || endR < 0 || endC < 0) continue;
      let ok = true;
      for (let i = 0; i < item.word.length; i += 1) {
        const cell = grid[row + dr * i]?.[col + dc * i];
        if (cell && cell !== item.word[i]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < item.word.length; i += 1) {
        grid[row + dr * i]![col + dc * i] = item.word[i]!;
      }
      placed = true;
    }
    if (!placed) return null;
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!grid[r]![c]) {
        grid[r]![c] = alphabet[Math.floor(random() * alphabet.length)]!;
      }
    }
  }

  return { size, grid, words };
}
