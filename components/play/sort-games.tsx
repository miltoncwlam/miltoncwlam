"use client";

import { useMemo, useState } from "react";

import { categoryBins, categoryOf, promptText, shortTarget } from "@/lib/play/answers";
import { playBeep } from "@/lib/play/juice";
import { quizExplanation } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { PlayFinished, PlayShell, WhyBox, usePlayJuice } from "./play-shell";

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
  const [combo, setCombo] = useState(0);
  const current = queue[0];

  if (!current) {
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
      clock={timed ? 60 : undefined}
      combo={combo}
      maxScore={startCount}
      score={score}
      title={timed ? "Speed sorting" : "Group sort"}
      skin="sort"
    >
      <p className="play-prompt">{promptText(current)}</p>
      <p className="play-muted">{shortTarget(current) ?? current.back}</p>
      <SortBins
        bins={bins}
        current={current}
        onPick={(ok) => {
          setCombo((n) => (ok ? n + 1 : 0));
          if (ok) setScore((n) => n + 1);
          setQueue((list) => list.slice(1));
        }}
      />
    </PlayShell>
  );
}

function SortBins({
  bins,
  current,
  onPick,
}: {
  bins: [string, Flashcard[]][];
  current: Flashcard;
  onPick: (ok: boolean) => void;
}) {
  const juice = usePlayJuice();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {bins.map(([name]) => (
        <button
          className="play-choice play-bin"
          key={name}
          onClick={() => {
            const ok = categoryOf(current) === name;
            playBeep(ok ? "hit" : "miss");
            if (!ok) juice.addTime(-2);
            onPick(ok);
          }}
          type="button"
        >
          {name}
        </button>
      ))}
    </div>
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
    <PlayShell maxScore={rounds.length} score={score} skin="sort" title="Odd one out">
      <p className="play-muted">
        Three share a group. Tap the one that does not belong.
      </p>
      <div className="grid gap-2">
        {round.map((card) => (
          <button
            className="play-choice text-left"
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
    <PlayShell maxScore={original.length} score={0} skin="sort" title="Rank order">
      <p className="play-muted">
        Put these in the deck’s study order (first to last).
      </p>
      <ol className="play-rank">
        {order.map((card, index) => (
          <li className="play-rank-item" key={card.id}>
            <span className="play-rank-num">{index + 1}</span>
            <span className="flex-1 text-sm font-semibold">{promptText(card)}</span>
            <button
              className="play-key"
              disabled={index === 0}
              onClick={() => {
                const next = [...order];
                [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                setOrder(next);
              }}
              type="button"
            >
              ↑
            </button>
            <button
              className="play-key"
              disabled={index === order.length - 1}
              onClick={() => {
                const next = [...order];
                [next[index + 1], next[index]] = [next[index]!, next[index + 1]!];
                setOrder(next);
              }}
              type="button"
            >
              ↓
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
    <PlayShell maxScore={rounds.length} score={score} skin="arena" title="True or false">
      <p className="play-prompt">{promptText(round.card)}</p>
      <p className="play-scroll mb-4">{round.statement}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="play-choice play-tf play-tf--yes"
          disabled={feedback !== null}
          onClick={() => {
            const ok = round.truth;
            setFeedback(ok);
            if (ok) setScore((n) => n + 1);
          }}
          type="button"
        >
          True
        </button>
        <button
          className="play-choice play-tf play-tf--no"
          disabled={feedback !== null}
          onClick={() => {
            const ok = !round.truth;
            setFeedback(ok);
            if (ok) setScore((n) => n + 1);
          }}
          type="button"
        >
          False
        </button>
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
