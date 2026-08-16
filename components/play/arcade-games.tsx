"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { promptText } from "@/lib/play/answers";
import { playBeep, prefersReducedMotion } from "@/lib/play/juice";
import type { Flashcard } from "@/lib/types/flashcard";

import { GhostSvg, HeroSvg, PlaneSvg, ShopSignSvg } from "./play-art";
import { chipOf, missWhy, mixWithDecoys, takeChips } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox, usePlayJuice } from "./play-shell";

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

const DOOR_COLORS = ["#e23d3d", "#2f6fed", "#2f9e5f", "#f0c14a"];

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

function MazeMovers({
  posRef,
  moveToRef,
  onGhost,
}: {
  posRef: React.MutableRefObject<[number, number]>;
  moveToRef: React.MutableRefObject<(next: [number, number]) => void>;
  onGhost: () => void;
}) {
  const juice = usePlayJuice();
  const ghostFn = useRef(onGhost);

  useEffect(() => {
    ghostFn.current = onGhost;
  }, [onGhost]);

  useEffect(() => {
    if (!juice.started) return;
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
  }, [juice.started, posRef, moveToRef]);

  useEffect(() => {
    if (!juice.started) return;
    const timer = window.setInterval(() => ghostFn.current(), 420);
    return () => window.clearInterval(timer);
  }, [juice.started]);

  return null;
}

export function MazeChaseGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => takeChips(cards, 10), [cards]);
  const start = findChar("P");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState(start);
  const [ghost, setGhost] = useState<[number, number]>([1, 1]);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [iframeUntil, setIframeUntil] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const card = pool[index];
  const choices = useMemo(() => {
    if (!card) return [];
    return mixWithDecoys(card, pool, 3).map((item, i) => ({
      ...EXITS[i]!,
      card: item,
      label: chipOf(item),
      color: DOOR_COLORS[i]!,
    }));
  }, [card, pool]);
  const resolved = useRef(false);
  const posRef = useRef(pos);
  const ghostRef = useRef(ghost);
  const iframeRef = useRef(0);
  const moveToRef = useRef<(next: [number, number]) => void>(() => undefined);
  const resolveRef = useRef<(nextPos: [number, number], nextGhost: [number, number]) => void>(
    () => undefined,
  );

  useEffect(() => {
    resolved.current = false;
  }, [index]);

  const resolve = useCallback(
    (nextPos: [number, number], nextGhost: [number, number]) => {
      const current = card;
      if (resolved.current || !current) return;
      if (nextPos[0] === nextGhost[0] && nextPos[1] === nextGhost[1]) {
        if (Date.now() < iframeRef.current) return;
        playBeep("miss");
        setCombo(0);
        setLives((n) => n - 1);
        iframeRef.current = Date.now() + 1500;
        setIframeUntil(iframeRef.current);
        posRef.current = start;
        setPos(start);
        return;
      }
      const hit = choices.find(
        (exit) => exit.r === nextPos[0] && exit.c === nextPos[1],
      );
      if (!hit) return;
      resolved.current = true;
      const ok = hit.card.id === current.id;
      playBeep(ok ? "hit" : "miss");
      setCombo((n) => (ok ? n + 1 : 0));
      if (ok) setScore((n) => n + 1);
      else setWhy(missWhy(current));
      if (ok) {
        setIndex((n) => n + 1);
        posRef.current = start;
        setPos(start);
      } else {
        posRef.current = start;
        setPos(start);
      }
    },
    [card, choices, start],
  );

  const moveTo = useCallback((next: [number, number]) => {
    posRef.current = next;
    setPos(next);
    resolveRef.current(next, ghostRef.current);
  }, []);

  useLayoutEffect(() => {
    posRef.current = pos;
    ghostRef.current = ghost;
    iframeRef.current = iframeUntil;
    resolveRef.current = resolve;
    moveToRef.current = moveTo;
  }, [pos, ghost, iframeUntil, resolve, moveTo]);

  function stepGhost() {
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
  }

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
      clock={75}
      combo={combo}
      lives={lives}
      maxScore={pool.length}
      score={score}
      skin="maze"
      title="Prefect’s corridor"
    >
      <MazeMovers moveToRef={moveToRef} onGhost={stepGhost} posRef={posRef} />
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-maze-board">
        <div
          className="play-maze-grid"
          data-started="1"
          style={{
            gridTemplateColumns: `repeat(${MAZE[0]!.length}, var(--maze-cell, 1.55rem))`,
          }}
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
                  style={exit ? { background: exit.color } : undefined}
                  title={exit?.label}
                >
                  {here ? <HeroSvg /> : foe ? <GhostSvg /> : ""}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <ul className="play-legend">
        {choices.map((exit) => (
          <li key={exit.card.id}>
            <span className="play-legend-swatch" style={{ background: exit.color }} />
            <span className="play-chip">{exit.label}</span>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-4 grid w-40 grid-cols-3 gap-1">
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
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => {
            setWhy(null);
            setIndex((n) => n + 1);
          }}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}

export function GateDashGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const easy = prefersReducedMotion() || process.env.NODE_ENV === "test";
  const pool = useMemo(() => takeChips(cards, 10), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [lock, setLock] = useState(false);
  const [lane, setLane] = useState<number | null>(null);
  const card = pool[index];
  const gates = useMemo(
    () => (card ? mixWithDecoys(card, pool, 2).slice(0, 3) : []),
    [card, pool],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const n = Number(event.key);
      if (n < 1 || n > 3 || lock || !gates[n - 1]) return;
      pick(gates[n - 1]!, n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pick(gate: Flashcard, i: number) {
    if (!card || lock) return;
    setLock(true);
    const ok = gate.id === card.id;
    const resolve = () => {
      playBeep(ok ? "hit" : "miss");
      setCombo((n) => (ok ? n + 1 : 0));
      if (ok) setScore((n) => n + 1);
      else setWhy(missWhy(card));
      if (ok) {
        window.setTimeout(() => {
          setLane(null);
          setLock(false);
          setIndex((n) => n + 1);
        }, easy ? 0 : 200);
      }
    };
    if (easy) {
      resolve();
      return;
    }
    setLane(i);
    window.setTimeout(resolve, 420);
  }

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="gate-dash"
      />
    );
  }

  return (
    <PlayShell
      clock={75}
      combo={combo}
      maxScore={pool.length}
      score={score}
      skin="plane"
      title="Gate dash"
    >
      <p className="play-muted">Tap a shop sign to fly the plane into that gate.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-sky play-gate-sky">
        <span className={`play-gate-plane ${lane === null ? "" : `is-fly is-lane-${lane}`}`}>
          <PlaneSvg />
        </span>
      </div>
      <div className="play-gate-row">
        {gates.map((gate, i) => (
          <button
            className="play-chip play-sprite play-gate"
            data-card-id={gate.id}
            disabled={lock}
            key={`${gate.id}-${i}`}
            onClick={() => pick(gate, i)}
            type="button"
          >
            <ShopSignSvg n={i + 1} />
            <span className="play-sprite-label">{chipOf(gate)}</span>
          </button>
        ))}
      </div>
      {why ? (
        <WhyBox
          ok={false}
          onContinue={() => {
            setWhy(null);
            setLane(null);
            setLock(false);
            setIndex((n) => n + 1);
          }}
          why={why}
        />
      ) : null}
    </PlayShell>
  );
}
