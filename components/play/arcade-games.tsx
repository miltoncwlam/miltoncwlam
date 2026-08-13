"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { promptText, shortTarget } from "@/lib/play/answers";
import { playBeep } from "@/lib/play/juice";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { GhostSvg, HeroSvg, PlaneSvg } from "./play-art";
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
  const [combo, setCombo] = useState(0);
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
  const resolved = useRef(false);
  const posRef = useRef(pos);
  const ghostRef = useRef(ghost);
  const moveToRef = useRef<(next: [number, number]) => void>(() => undefined);
  const resolveRef = useRef<(nextPos: [number, number], nextGhost: [number, number]) => void>(
    () => undefined,
  );
  const choicesRef = useRef(choices);
  const cardRef = useRef(card);

  useEffect(() => {
    resolved.current = false;
  }, [index]);

  const resolve = useCallback((nextPos: [number, number], nextGhost: [number, number]) => {
    const current = cardRef.current;
    if (resolved.current || !current) return;
    if (nextPos[0] === nextGhost[0] && nextPos[1] === nextGhost[1]) {
      playBeep("miss");
      setCombo(0);
      setLives((n) => n - 1);
      posRef.current = start;
      setPos(start);
      return;
    }
    const hit = choicesRef.current.find(
      (exit) => exit.r === nextPos[0] && exit.c === nextPos[1],
    );
    if (!hit) return;
    resolved.current = true;
    const ok = hit.card.id === current.id;
    playBeep(ok ? "hit" : "miss");
    setCombo((n) => (ok ? n + 1 : 0));
    if (ok) setScore((n) => n + 1);
    setIndex((n) => n + 1);
    posRef.current = start;
    setPos(start);
  }, [start]);

  const moveTo = useCallback((next: [number, number]) => {
    posRef.current = next;
    setPos(next);
    resolveRef.current(next, ghostRef.current);
  }, []);

  useLayoutEffect(() => {
    posRef.current = pos;
    ghostRef.current = ghost;
    choicesRef.current = choices;
    cardRef.current = card;
    resolveRef.current = resolve;
    moveToRef.current = moveTo;
  }, [pos, ghost, choices, card, resolve, moveTo]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const delta = DIRS[event.key];
      if (!delta) return;
      event.preventDefault();
      const [r, c] = posRef.current;
      const nr = r + delta[0];
      const nc = c + delta[1];
      moveToRef.current(isWall(nr, nc) ? [r, c] : [nr, nc]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const [r, c] = ghostRef.current;
      const options = (
        [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ] as [number, number][]
      ).filter(([nr, nc]) => !isWall(nr, nc));
      const next = options[Math.floor(Math.random() * options.length)] ?? [r, c];
      ghostRef.current = next;
      setGhost(next);
      resolveRef.current(posRef.current, next);
    }, 420);
    return () => window.clearInterval(timer);
  }, [index]);

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
    const [r, c] = posRef.current;
    const nr = r + dr;
    const nc = c + dc;
    moveTo(isWall(nr, nc) ? [r, c] : [nr, nc]);
  }

  return (
    <PlayShell
      combo={combo}
      lives={lives}
      maxScore={pool.length}
      score={score}
      skin="maze"
      title="Maze chase"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-maze-board">
        <div
          className="play-maze-grid"
          style={{ gridTemplateColumns: `repeat(${MAZE[0]!.length}, 1.55rem)` }}
        >
          {MAZE.flatMap((row, r) =>
            row.split("").map((cell, c) => {
              const exit = choices.find((item) => item.r === r && item.c === c);
              const here = pos[0] === r && pos[1] === c;
              const foe = ghost[0] === r && ghost[1] === c;
              return (
                <div
                  className={`play-maze-cell ${
                    cell === "#"
                      ? "play-maze-cell--wall"
                      : exit
                        ? "play-maze-cell--exit"
                        : "play-maze-cell--floor"
                  }`}
                  key={`${r}-${c}`}
                  title={exit?.label}
                >
                  {here ? <HeroSvg /> : foe ? <GhostSvg /> : exit ? exit.label.slice(0, 2) : ""}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="mx-auto mt-6 grid w-40 grid-cols-3 gap-1">
        <span />
        <button className="play-choice play-choice--center py-3" onClick={() => nudge(-1, 0)} type="button">
          ↑
        </button>
        <span />
        <button className="play-choice play-choice--center py-3" onClick={() => nudge(0, -1)} type="button">
          ←
        </button>
        <button className="play-choice play-choice--center py-3" onClick={() => nudge(1, 0)} type="button">
          ↓
        </button>
        <button className="play-choice play-choice--center py-3" onClick={() => nudge(0, 1)} type="button">
          →
        </button>
      </div>
      <ul className="play-muted mt-3 text-center text-xs">
        {choices.map((exit) => (
          <li key={exit.card.id}>{exit.label}</li>
        ))}
      </ul>
    </PlayShell>
  );
}

type Cloud = { id: number; lane: number; y: number; card: Flashcard };

let cloudSeq = 1;

function spawnClouds(card: Flashcard, pool: Flashcard[]): Cloud[] {
  const others = shuffleList(pool.filter((item) => item.id !== card.id)).slice(
    0,
    3,
  );
  return shuffleList([card, ...others]).map((item, i) => ({
    id: cloudSeq++,
    lane: i,
    y: -10 - i * 18,
    card: item,
  }));
}

function PlaneSky({
  card,
  lane,
  onHit,
  onLane,
  pool,
}: {
  card: Flashcard;
  lane: number;
  onHit: (ok: boolean) => void;
  onLane: (lane: number) => void;
  pool: Flashcard[];
}) {
  const [clouds, setClouds] = useState(() => spawnClouds(card, pool));
  const hitLock = useRef(false);
  const laneRef = useRef(lane);
  const onHitRef = useRef(onHit);
  const cardRef = useRef(card);
  const cloudsRef = useRef(clouds);

  useLayoutEffect(() => {
    laneRef.current = lane;
    onHitRef.current = onHit;
    cardRef.current = card;
    cloudsRef.current = clouds;
  }, [lane, onHit, card, clouds]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (hitLock.current) return;
      const moved = cloudsRef.current.map((cloud) => ({
        ...cloud,
        y: cloud.y + 2.4,
      }));
      cloudsRef.current = moved;
      setClouds(moved);
      const current = cardRef.current;
      if (!current) return;
      const hit = moved.find(
        (cloud) => cloud.y >= 78 && cloud.y < 92 && cloud.lane === laneRef.current,
      );
      if (hit) {
        hitLock.current = true;
        const ok = hit.card.id === current.id;
        playBeep(ok ? "hit" : "miss");
        onHitRef.current(ok);
      } else if (moved.length && moved.every((cloud) => cloud.y > 96)) {
        hitLock.current = true;
        playBeep("miss");
        onHitRef.current(false);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="play-sky">
      {clouds.map((cloud) => (
        <button
          className="play-cloud"
          key={cloud.id}
          onClick={() => onLane(cloud.lane)}
          style={{ left: `${6 + cloud.lane * 24}%`, top: `${cloud.y}%` }}
          type="button"
        >
          {(shortTarget(cloud.card) ?? cloud.card.back).slice(0, 28)}
        </button>
      ))}
      <div className="play-plane-wrap" style={{ left: `${6 + lane * 24}%` }}>
        <PlaneSvg />
      </div>
    </div>
  );
}

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
  const [combo, setCombo] = useState(0);
  const [lane, setLane] = useState(1);
  const card = pool[index];

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
    <PlayShell
      combo={combo}
      maxScore={pool.length}
      score={score}
      skin="plane"
      title="Airplane"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <PlaneSky
        card={card}
        key={index}
        lane={lane}
        onHit={(ok) => {
          setCombo((n) => (ok ? n + 1 : 0));
          if (ok) setScore((n) => n + 1);
          setIndex((n) => n + 1);
        }}
        onLane={setLane}
        pool={pool}
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((value) => (
          <button
            className="play-choice play-choice--center"
            key={value}
            onClick={() => setLane(value)}
            type="button"
          >
            Lane {value + 1}
          </button>
        ))}
      </div>
    </PlayShell>
  );
}
