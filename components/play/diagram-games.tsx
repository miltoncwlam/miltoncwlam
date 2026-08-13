"use client";

import { useEffect, useMemo, useState } from "react";

import { promptText, shortTarget } from "@/lib/play/answers";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { PlayFinished, PlayShell } from "./play-shell";

function illustrated(cards: Flashcard[]) {
  return shuffleList(cards.filter((card) => card.imageUrl));
}

export function LabelledDiagramGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const [boards] = useState(() => {
    const pool = illustrated(cards);
    const groups: Flashcard[][] = [];
    for (let i = 0; i + 4 <= Math.min(pool.length, 12); i += 4) {
      groups.push(pool.slice(i, i + 4));
    }
    return groups;
  });
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const board = boards[index];

  const labels = useMemo(
    () =>
      board
        ? shuffleList(
            board.map((card) => ({
              id: card.id,
              text: shortTarget(card) ?? card.back,
            })),
          )
        : [],
    [board],
  );

  useEffect(() => {
    if (!board || matched.size < board.length) return;
    setMatched(new Set());
    setPicked(null);
    setIndex((n) => n + 1);
  }, [board, matched.size]);

  if (!board || index >= boards.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={boards.reduce((sum, group) => sum + group.length, 0)}
        score={score}
        template="labelled-diagram"
      />
    );
  }

  return (
    <PlayShell
      maxScore={boards.reduce((sum, group) => sum + group.length, 0)}
      score={score}
      title="Labelled diagram"
    >
      <p className="text-sm text-[var(--muted)]">
        Tap a picture, then the matching label.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {board.map((card) => (
          <button
            className={`overflow-hidden rounded-2xl border ${
              matched.has(card.id)
                ? "border-emerald-400"
                : picked === card.id
                  ? "border-[var(--accent)]"
                  : "border-[var(--border)]"
            }`}
            disabled={matched.has(card.id)}
            key={card.id}
            onClick={() => setPicked(card.id)}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={promptText(card)}
              className="h-28 w-full object-cover"
              src={card.imageUrl!}
            />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <button
            className="secondary-button"
            disabled={matched.has(label.id)}
            key={label.id}
            onClick={() => {
              if (!picked) return;
              if (picked === label.id) {
                setMatched(new Set(matched).add(label.id));
                setScore((n) => n + 1);
                setPicked(null);
              } else {
                setPicked(null);
              }
            }}
            type="button"
          >
            {label.text}
          </button>
        ))}
      </div>
    </PlayShell>
  );
}

export function LabelMatchGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => illustrated(cards).slice(0, 8), [cards]);
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const labels = useMemo(
    () =>
      shuffleList(
        pool.map((card) => ({
          id: card.id,
          text: shortTarget(card) ?? card.back,
        })),
      ),
    [pool],
  );

  if (matched.size >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={Math.max(0, pool.length - misses)}
        template="label-match"
      />
    );
  }

  return (
    <PlayShell
      extra={`${misses} misses`}
      maxScore={pool.length}
      score={matched.size}
      title="Label match"
    >
      <p className="text-sm text-[var(--muted)]">
        Tap a picture, then tap its label.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {pool.map((card) => (
          <button
            className={`flex items-center gap-3 rounded-2xl border p-2 text-left ${
              matched.has(card.id)
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                : picked === card.id
                  ? "border-[var(--accent)]"
                  : "border-[var(--border)]"
            }`}
            disabled={matched.has(card.id)}
            key={card.id}
            onClick={() => setPicked(card.id)}
            type="button"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
              src={card.imageUrl!}
            />
            <span className="text-xs text-[var(--muted)]">
              {matched.has(card.id) ? shortTarget(card) : "Label this"}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <button
            className="secondary-button"
            disabled={matched.has(label.id)}
            key={label.id}
            onClick={() => {
              if (!picked) return;
              if (picked === label.id) {
                setMatched(new Set(matched).add(label.id));
                setPicked(null);
              } else {
                setMisses((n) => n + 1);
                setPicked(null);
              }
            }}
            type="button"
          >
            {label.text}
          </button>
        ))}
      </div>
    </PlayShell>
  );
}
