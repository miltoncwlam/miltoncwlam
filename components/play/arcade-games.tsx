"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { promptText, shortTarget } from "@/lib/play/answers";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { PlayFinished, PlayShell } from "./play-shell";

const MAZE = [
  "###########",
  "#.........#",
  "#.##.#.##.#",
  "#.........#",
  "##.#...#.##",
  "#....P....#",
  "##.#...#.##",
  "#.........#",
  "#.##.#.##.#",
  "#.........#",
  "###########",
];

const DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  w: [-1, 0],
  s: [1, 0],
  a: [0, -1],
  d: [0, 1],
};

function findChar(letter: string): [number, number] {
  for (let r = 0; r < MAZE.length; r += 1) {
    const c = MAZE[r]!.indexOf(letter);
    if (c >= 0) return [r, c];
  }
  return [5, 5];
}

function isWall(r: number, c: number) {
  return MAZE[r]?.[c] === "#";
}

const EXITS: { r: number; c: number }[] = [
  { r: 1, c: 5 },
  { r: 5, c: 9 },
  { r: 9, c: 5 },
  { r: 5, c: 1 },
];

export function MazeChaseGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => shuffleList(cards).slice(0, 10), [cards]);
  const start = findChar("P");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState(start);
  const [ghost, setGhost] = useState<[number, number]>([1, 1]);
  const [lives, setLives] = useState(3);
  const resolved = useRef(false);
  const card = pool[index];
  const choices = useMemo(() => {
    if (!card) return [];
    const others = shuffleList(pool.filter((item) => item.id !== card.id)).slice(
      0,
      3,
    );
    return shuffleList([card, ...others]).map((item, i) => ({
      ...EXITS[i]!,
      card: item,
      label: shortTarget(item) ?? item.back,
    }));
  }, [card, pool]);

  useEffect(() => {
    resolved.current = false;
  }, [index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const delta = DIRS[event.key];
      if (!delta) return;
      event.preventDefault();
      setPos(([r, c]) => {
        const nr = r + delta[0];
        const nc = c + delta[1];
        return isWall(nr, nc) ? [r, c] : [nr, nc];
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setGhost(([r, c]) => {
        const options = (
          [
            [r - 1, c],
            [r + 1, c],
            [r, c - 1],
            [r, c + 1],
          ] as [number, number][]
        ).filter(([nr, nc]) => !isWall(nr, nc));
        return options[Math.floor(Math.random() * options.length)] ?? [r, c];
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [index]);

  useEffect(() => {
    if (resolved.current || !card) return;
    if (pos[0] === ghost[0] && pos[1] === ghost[1]) {
      setLives((n) => n - 1);
      setPos(start);
      return;
    }
    const hit = choices.find((exit) => exit.r === pos[0] && exit.c === pos[1]);
    if (!hit) return;
    resolved.current = true;
    if (hit.card.id === card.id) setScore((n) => n + 1);
    setIndex((n) => n + 1);
    setPos(start);
  }, [pos, ghost, choices, card, start]);

  if (!card || index >= pool.length || lives <= 0) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="maze-chase"
      />
    );
  }

  function nudge(dr: number, dc: number) {
    setPos(([r, c]) => {
      const nr = r + dr;
      const nc = c + dc;
      return isWall(nr, nc) ? [r, c] : [nr, nc];
    });
  }

  return (
    <PlayShell
      extra={`${lives} lives`}
      maxScore={pool.length}
      score={score}
      title="Maze chase"
    >
      <p className="text-center font-bold">{promptText(card)}</p>
      <div className="mx-auto grid w-max gap-px rounded-xl bg-[var(--border)] p-1">
        {MAZE.map((row, r) => (
          <div className="flex gap-px" key={r}>
            {row.split("").map((cell, c) => {
              const exit = choices.find((item) => item.r === r && item.c === c);
              const here = pos[0] === r && pos[1] === c;
              const foe = ghost[0] === r && ghost[1] === c;
              return (
                <div
                  className={`flex h-7 w-7 items-center justify-center text-[8px] font-bold ${
                    cell === "#"
                      ? "bg-[var(--ink)]"
                      : here
                        ? "bg-[var(--accent)] text-[var(--primary-foreground)]"
                        : foe
                          ? "bg-rose-500 text-white"
                          : exit
                            ? "bg-[var(--secondary)]"
                            : "bg-[var(--surface)]"
                  }`}
                  key={`${r}-${c}`}
                  title={exit?.label}
                >
                  {here ? "•" : foe ? "!" : exit ? exit.label.slice(0, 2) : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mx-auto grid w-36 grid-cols-3 gap-1">
        <span />
        <button className="secondary-button py-2" onClick={() => nudge(-1, 0)} type="button">
          ↑
        </button>
        <span />
        <button className="secondary-button py-2" onClick={() => nudge(0, -1)} type="button">
          ←
        </button>
        <button className="secondary-button py-2" onClick={() => nudge(1, 0)} type="button">
          ↓
        </button>
        <button className="secondary-button py-2" onClick={() => nudge(0, 1)} type="button">
          →
        </button>
      </div>
      <ul className="text-xs text-[var(--muted)]">
        {choices.map((exit) => (
          <li key={exit.card.id}>{exit.label}</li>
        ))}
      </ul>
    </PlayShell>
  );
}

type Cloud = { id: number; lane: number; y: number; card: Flashcard };

export function AirplaneGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => shuffleList(cards).slice(0, 10), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lane, setLane] = useState(1);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const nextId = useRef(1);
  const card = pool[index];

  useEffect(() => {
    if (!card) return;
    const others = shuffleList(pool.filter((item) => item.id !== card.id)).slice(
      0,
      3,
    );
    const set = shuffleList([card, ...others]);
    setClouds(
      set.map((item, i) => ({
        id: nextId.current++,
        lane: i,
        y: -10 - i * 18,
        card: item,
      })),
    );
  }, [card, pool]);

  const hitLock = useRef(false);

  useEffect(() => {
    hitLock.current = false;
  }, [index]);

  useEffect(() => {
    if (!card) return;
    const timer = window.setInterval(() => {
      setClouds((list) =>
        list.map((cloud) => ({ ...cloud, y: cloud.y + 2.4 })),
      );
    }, 40);
    return () => window.clearInterval(timer);
  }, [card, index]);

  useEffect(() => {
    if (hitLock.current || !card) return;
    const hit = clouds.find(
      (cloud) => cloud.y >= 78 && cloud.y < 92 && cloud.lane === lane,
    );
    if (hit) {
      hitLock.current = true;
      if (hit.card.id === card.id) setScore((n) => n + 1);
      setIndex((n) => n + 1);
    } else if (clouds.length && clouds.every((cloud) => cloud.y > 96)) {
      hitLock.current = true;
      setIndex((n) => n + 1);
    }
  }, [clouds, lane, card]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key === "a") {
        setLane((n) => Math.max(0, n - 1));
      }
      if (event.key === "ArrowRight" || event.key === "d") {
        setLane((n) => Math.min(3, n + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="airplane"
      />
    );
  }

  return (
    <PlayShell maxScore={pool.length} score={score} title="Airplane">
      <p className="text-center font-bold">{promptText(card)}</p>
      <div className="relative h-80 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--secondary)]">
        {clouds.map((cloud) => (
          <button
            className="absolute w-[22%] rounded-full bg-[var(--surface)] px-1 py-3 text-center text-[10px] font-bold shadow"
            key={cloud.id}
            onClick={() => setLane(cloud.lane)}
            style={{ left: `${6 + cloud.lane * 24}%`, top: `${cloud.y}%` }}
            type="button"
          >
            {(shortTarget(cloud.card) ?? cloud.card.back).slice(0, 28)}
          </button>
        ))}
        <div
          className="absolute bottom-3 flex h-10 w-[22%] items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black"
          style={{ left: `${6 + lane * 24}%` }}
        >
          ✈
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((value) => (
          <button
            className="secondary-button"
            key={value}
            onClick={() => setLane(value)}
            type="button"
          >
            {value + 1}
          </button>
        ))}
      </div>
    </PlayShell>
  );
}
