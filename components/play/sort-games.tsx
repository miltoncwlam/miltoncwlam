"use client";

import { useMemo, useRef, useState } from "react";

import { categoryBins, categoryOf, promptText } from "@/lib/play/answers";
import { playBeep } from "@/lib/play/juice";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { TraySvg } from "./play-art";
import { missWhy } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox, usePlayJuice } from "./play-shell";

export function GroupSortGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const bins = useMemo(() => categoryBins(cards).slice(0, 4), [cards]);
  const allowed = useMemo(() => new Set(bins.map(([name]) => name)), [bins]);
  const [queue, setQueue] = useState(() =>
    shuffleList(cards.filter((card) => allowed.has(categoryOf(card)))).slice(
      0,
      16,
    ),
  );
  const [redo, setRedo] = useState<Flashcard[]>([]);
  const [startCount] = useState(() =>
    Math.min(
      16,
      cards.filter((card) => allowed.has(categoryOf(card))).length,
    ),
  );
  const [score, setScore] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const current = queue[0] ?? redo[0];

  if (!current && queue.length === 0 && redo.length === 0) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={startCount}
        score={score}
        template="group-sort"
      />
    );
  }

  if (!current) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={startCount}
        score={score}
        template="group-sort"
      />
    );
  }

  return (
    <PlayShell
      clock={false}
      extra={redo.length ? `${redo.length} redo` : undefined}
      maxScore={startCount}
      score={score}
      skin="sort"
      title="Homework trays"
    >
      <p className="play-muted">Flick the paper into a tray, or tap a tray.</p>
      <p className="play-prompt">{promptText(current)}</p>
      <SortPaper
        current={current}
        onPick={(ok) => {
          if (ok) {
            setScore((n) => n + 1);
            if (queue[0]?.id === current.id) setQueue((list) => list.slice(1));
            else setRedo((list) => list.slice(1));
            setWhy(null);
          } else {
            setWhy(missWhy(current));
            if (queue[0]?.id === current.id) {
              setQueue((list) => list.slice(1));
              setRedo((list) => [...list, current]);
            }
          }
        }}
      />
      <div className="play-tray-row">
        {bins.map(([name]) => (
          <TrayButton
            current={current}
            key={name}
            name={name}
            onPick={(ok) => {
              if (ok) {
                setScore((n) => n + 1);
                if (queue[0]?.id === current.id) setQueue((list) => list.slice(1));
                else setRedo((list) => list.slice(1));
                setWhy(null);
              } else {
                setWhy(missWhy(current));
                if (queue[0]?.id === current.id) {
                  setQueue((list) => list.slice(1));
                  setRedo((list) => [...list, current]);
                }
              }
            }}
          />
        ))}
      </div>
      {why ? (
        <WhyBox ok={false} onContinue={() => setWhy(null)} why={why} />
      ) : null}
    </PlayShell>
  );
}

function TrayButton({
  name,
  current,
  onPick,
}: {
  name: string;
  current: Flashcard;
  onPick: (ok: boolean) => void;
}) {
  const juice = usePlayJuice();
  return (
    <button
      className="play-choice play-bin play-sprite play-tray"
      data-tray={name}
      onClick={() => {
        if (!juice.started) return;
        const ok = categoryOf(current) === name;
        playBeep(ok ? "hit" : "miss");
        onPick(ok);
      }}
      type="button"
    >
      <TraySvg />
      <span className="play-sprite-label">{name}</span>
    </button>
  );
}

function SortPaper({
  current,
  onPick,
}: {
  current: Flashcard;
  onPick: (ok: boolean) => void;
}) {
  const juice = usePlayJuice();
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <button
      className="play-sort-paper"
      onPointerDown={(event) => {
        if (!juice.started) return;
        origin.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!origin.current) return;
        setPos({
          x: event.clientX - origin.current.x,
          y: event.clientY - origin.current.y,
        });
      }}
      onPointerUp={(event) => {
        if (!origin.current) return;
        origin.current = null;
        setPos(null);
        const hit = document
          .elementsFromPoint(event.clientX, event.clientY)
          .find((node) => node instanceof HTMLElement && node.dataset.tray);
        const name = hit instanceof HTMLElement ? hit.dataset.tray : undefined;
        if (!name) return;
        const ok = categoryOf(current) === name;
        playBeep(ok ? "hit" : "miss");
        onPick(ok);
      }}
      style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
      type="button"
    >
      Flick
    </button>
  );
}
