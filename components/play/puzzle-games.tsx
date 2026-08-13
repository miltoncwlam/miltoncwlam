"use client";

import { useMemo, useState } from "react";

import { buildCrossword, buildWordsearch } from "@/lib/play/puzzles";
import type { Flashcard } from "@/lib/types/flashcard";

import { PlayFinished, PlayShell } from "./play-shell";

export function CrosswordGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const puzzle = useMemo(() => buildCrossword(cards), [cards]);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  if (!puzzle) {
    return (
      <p className="empty-state">
        This deck does not have enough short answers for a crossword.
      </p>
    );
  }

  const score = puzzle.entries.filter((entry) => {
    const typed = (guesses[`${entry.row}-${entry.col}-${entry.dir}`] ?? "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    return typed === entry.word;
  }).length;

  if (done) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={puzzle.entries.length}
        score={score}
        template="crossword"
      />
    );
  }

  return (
    <PlayShell
      maxScore={puzzle.entries.length}
      score={score}
      title="Crossword"
      skin="puzzle"
    >
      <div className="play-xw-wrap">
        <div
          className="play-xw"
          style={{
            gridTemplateColumns: `repeat(${puzzle.width}, 1.7rem)`,
          }}
        >
          {puzzle.grid.flatMap((row, r) =>
            row.map((cell, c) => (
              <div
                className={`play-xw-cell ${cell ? "" : "is-empty"}`}
                key={`${r}-${c}`}
              >
                {cell ? "·" : ""}
              </div>
            )),
          )}
        </div>
      </div>
      <ol className="space-y-3 text-sm">
        {puzzle.entries.map((entry) => (
          <li key={`${entry.dir}-${entry.number}`}>
            <label className="block font-semibold">
              {entry.number} {entry.dir}: {entry.clue}
            </label>
            <input
              className="play-input mt-1 font-mono uppercase"
              maxLength={entry.word.length}
              onChange={(event) =>
                setGuesses((current) => ({
                  ...current,
                  [`${entry.row}-${entry.col}-${entry.dir}`]: event.target.value,
                }))
              }
              value={guesses[`${entry.row}-${entry.col}-${entry.dir}`] ?? ""}
            />
          </li>
        ))}
      </ol>
      <button className="primary-button" onClick={() => setDone(true)} type="button">
        Check crossword
      </button>
    </PlayShell>
  );
}

export function WordsearchGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const puzzle = useMemo(() => buildWordsearch(cards), [cards]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [select, setSelect] = useState<{ r: number; c: number }[]>([]);

  if (!puzzle) {
    return (
      <p className="empty-state">
        This deck does not have enough short answers for a wordsearch.
      </p>
    );
  }

  if (found.size >= puzzle.words.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={puzzle.words.length}
        score={found.size}
        template="wordsearch"
      />
    );
  }

  return (
    <PlayShell
      maxScore={puzzle.words.length}
      score={found.size}
      title="Wordsearch"
      skin="puzzle"
    >
      <div className="play-ws-wrap">
        <div
          className="play-ws"
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1.7rem)` }}
        >
          {puzzle.grid.flatMap((row, r) =>
            row.map((cell, c) => {
              const on = select.some((item) => item.r === r && item.c === c);
              return (
                <button
                  className={`play-ws-cell ${on ? "is-on" : ""}`}
                  key={`${r}-${c}`}
                  onClick={() => {
                    const last = select[select.length - 1];
                    let next: { r: number; c: number }[];
                    if (!last) {
                      next = [{ r, c }];
                    } else {
                      const dr = r - last.r;
                      const dc = c - last.c;
                      const stepOk =
                        Math.abs(dr) <= 1 &&
                        Math.abs(dc) <= 1 &&
                        !(dr === 0 && dc === 0);
                      const dir =
                        select.length >= 2
                          ? {
                              dr: select[1]!.r - select[0]!.r,
                              dc: select[1]!.c - select[0]!.c,
                            }
                          : null;
                      const sameDir =
                        !dir || (dr === dir.dr && dc === dir.dc);
                      next =
                        stepOk && sameDir ? [...select, { r, c }] : [{ r, c }];
                    }
                    setSelect(next);
                    const letters = next
                      .map((item) => puzzle.grid[item.r]![item.c]!)
                      .join("");
                    const reversed = letters.split("").reverse().join("");
                    const hit = puzzle.words.find(
                      (item) => item.word === letters || item.word === reversed,
                    );
                    if (hit) {
                      setFound((current) => new Set(current).add(hit.word));
                      setSelect([]);
                    }
                  }}
                  type="button"
                >
                  {cell}
                </button>
              );
            }),
          )}
        </div>
      </div>
      <ul className="text-sm">
        {puzzle.words.map((item) => (
          <li
            className={found.has(item.word) ? "text-emerald-300 line-through" : ""}
            key={item.word}
          >
            {item.clue}
          </li>
        ))}
      </ul>
      <p className="play-muted">
        Tap neighbouring letters in a straight line to select a word.
      </p>
    </PlayShell>
  );
}
