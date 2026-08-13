"use client";

import { useEffect, useMemo, useState } from "react";

import { categoryBins, categoryOf, promptText, shortTarget } from "@/lib/play/answers";
import { quizExplanation } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

export function GroupSortGame({
  cards,
  deckId,
  timed = false,
}: {
  cards: Flashcard[];
  deckId: string;
  timed?: boolean;
}) {
  const bins = useMemo(() => categoryBins(cards).slice(0, 4), [cards]);
  const allowed = useMemo(() => new Set(bins.map(([name]) => name)), [bins]);
  const [queue, setQueue] = useState(() =>
    shuffleList(cards.filter((card) => allowed.has(categoryOf(card)))).slice(
      0,
      16,
    ),
  );
  const [startCount] = useState(queue.length);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const current = queue[0];

  useEffect(() => {
    if (!timed) return;
    if (seconds <= 0 || queue.length === 0) return;
    const id = window.setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timed, seconds, queue.length]);

  if (!current || (timed && seconds <= 0)) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={startCount}
        score={score}
        template={timed ? "speed-sort" : "group-sort"}
      />
    );
  }

  return (
    <PlayShell
      extra={timed ? `${seconds}s` : undefined}
      maxScore={startCount}
      score={score}
      title={timed ? "Speed sorting" : "Group sort"}
    >
      <p className="text-lg font-bold">{promptText(current)}</p>
      <p className="text-sm text-[var(--muted)]">
        {shortTarget(current) ?? current.back}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {bins.map(([name]) => (
          <button
            className="tcg-choice"
            key={name}
            onClick={() => {
              if (categoryOf(current) === name) setScore((n) => n + 1);
              setQueue((list) => list.slice(1));
            }}
            type="button"
          >
            {name}
          </button>
        ))}
      </div>
    </PlayShell>
  );
}

export function OddOneOutGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const rounds = useMemo(() => {
    const bins = categoryBins(cards);
    const list: Flashcard[][] = [];
    for (let i = 0; i < 8; i += 1) {
      const home = bins[i % bins.length];
      const other = bins.find((bin) => bin[0] !== home?.[0]);
      if (!home || !other || home[1].length < 3) continue;
      const three = shuffleList(home[1]).slice(0, 3);
      const odd = shuffleList(other[1])[0];
      if (!odd) continue;
      list.push(shuffleList([...three, odd]));
    }
    return list;
  }, [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const round = rounds[index];

  if (!round || index >= rounds.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={rounds.length}
        score={score}
        template="odd-one-out"
      />
    );
  }

  const counts = new Map<string, number>();
  for (const card of round) {
    const key = categoryOf(card);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const oddCategory = [...counts.entries()].find(([, n]) => n === 1)?.[0];

  return (
    <PlayShell maxScore={rounds.length} score={score} title="Odd one out">
      <p className="text-sm text-[var(--muted)]">
        Three share a group. Tap the one that does not belong.
      </p>
      <div className="grid gap-2">
        {round.map((card) => (
          <button
            className="tcg-choice text-left"
            disabled={feedback !== null}
            key={card.id}
            onClick={() => {
              const ok = categoryOf(card) === oddCategory;
              setFeedback(ok);
              if (ok) setScore((n) => n + 1);
            }}
            type="button"
          >
            {promptText(card)}
          </button>
        ))}
      </div>
      {feedback !== null ? (
        <WhyBox
          ok={feedback}
          onContinue={() => {
            setFeedback(null);
            setIndex((n) => n + 1);
          }}
          why={`The odd category is ${oddCategory}.`}
        />
      ) : null}
    </PlayShell>
  );
}

export function RankOrderGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const original = useMemo(
    () => [...cards].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 6),
    [cards],
  );
  const [order, setOrder] = useState(() => shuffleList(original));
  const [done, setDone] = useState(false);

  if (done) {
    const correct = order.filter(
      (card, index) => card.id === original[index]?.id,
    ).length;
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={original.length}
        score={correct}
        template="rank-order"
      />
    );
  }

  return (
    <PlayShell maxScore={original.length} score={0} title="Rank order">
      <p className="text-sm text-[var(--muted)]">
        Put these in the deck’s study order (first to last).
      </p>
      <ol className="space-y-2">
        {order.map((card, index) => (
          <li
            className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            key={card.id}
          >
            <span className="text-xs font-bold text-[var(--muted)]">
              {index + 1}
            </span>
            <span className="flex-1 text-sm font-semibold">
              {promptText(card)}
            </span>
            <button
              className="secondary-button px-2 py-1 text-xs"
              disabled={index === 0}
              onClick={() => {
                const next = [...order];
                [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                setOrder(next);
              }}
              type="button"
            >
              Up
            </button>
            <button
              className="secondary-button px-2 py-1 text-xs"
              disabled={index === order.length - 1}
              onClick={() => {
                const next = [...order];
                [next[index + 1], next[index]] = [next[index]!, next[index + 1]!];
                setOrder(next);
              }}
              type="button"
            >
              Down
            </button>
          </li>
        ))}
      </ol>
      <button className="primary-button" onClick={() => setDone(true)} type="button">
        Check order
      </button>
    </PlayShell>
  );
}

export function TrueFalseGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const rounds = useMemo(() => {
    const shuffled = shuffleList(cards).slice(0, 12);
    return shuffled.map((card, index) => {
      const truth = index % 2 === 0 || shuffled.length < 2;
      const other =
        shuffleList(shuffled.filter((item) => item.id !== card.id))[0] ?? card;
      return {
        card,
        statement: truth ? card.back : other.back,
        truth,
      };
    });
  }, [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const round = rounds[index];

  if (!round || index >= rounds.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={rounds.length}
        score={score}
        template="true-or-false"
      />
    );
  }

  return (
    <PlayShell maxScore={rounds.length} score={score} title="True or false">
      <p className="font-bold">{promptText(round.card)}</p>
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        {round.statement}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {["True", "False"].map((label) => (
          <button
            className="tcg-choice"
            disabled={feedback !== null}
            key={label}
            onClick={() => {
              const ok = (label === "True") === round.truth;
              setFeedback(ok);
              if (ok) setScore((n) => n + 1);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {feedback !== null ? (
        <WhyBox
          ok={feedback}
          onContinue={() => {
            setFeedback(null);
            setIndex((n) => n + 1);
          }}
          why={quizExplanation(round.card) ?? round.card.back}
        />
      ) : null}
    </PlayShell>
  );
}
