"use client";

import { useMemo, useState } from "react";

import { quizExplanation } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";
import { promptText, shortTarget } from "@/lib/play/answers";

import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

function takePairs(cards: Flashcard[], max = 8) {
  return shuffleList(cards).slice(0, Math.min(max, cards.length));
}

export function MatchUpGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pairs = useMemo(() => takePairs(cards, 8), [cards]);
  const [left] = useState(() => shuffleList(pairs));
  const [right] = useState(() => shuffleList(pairs));
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);

  if (matched.size >= pairs.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pairs.length}
        score={Math.max(0, pairs.length - wrong)}
        template="match-up"
      />
    );
  }

  return (
    <PlayShell
      maxScore={pairs.length}
      score={matched.size}
      title="Match up"
    >
      <p className="text-sm text-[var(--muted)]">
        Tap a prompt, then the matching answer.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {left.map((card) => (
            <button
              className={`w-full rounded-2xl border px-3 py-3 text-left text-sm font-semibold ${
                matched.has(card.id)
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : picked === card.id
                    ? "border-[var(--accent)] bg-[var(--secondary)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
              }`}
              disabled={matched.has(card.id)}
              key={`l-${card.id}`}
              onClick={() => setPicked(card.id)}
              type="button"
            >
              {promptText(card)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((card) => (
            <button
              className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${
                matched.has(card.id)
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
              disabled={matched.has(card.id)}
              key={`r-${card.id}`}
              onClick={() => {
                if (!picked) return;
                if (picked === card.id) {
                  setMatched(new Set(matched).add(card.id));
                  setPicked(null);
                } else {
                  setWrong((value) => value + 1);
                  setPicked(null);
                }
              }}
              type="button"
            >
              {shortTarget(card) ?? card.back}
            </button>
          ))}
        </div>
      </div>
    </PlayShell>
  );
}

export function MatchingPairsGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pairs = useMemo(() => takePairs(cards, 8), [cards]);
  const [tiles] = useState(() =>
    shuffleList(
      pairs.flatMap((card) => [
        { id: `${card.id}-a`, cardId: card.id, text: promptText(card) },
        {
          id: `${card.id}-b`,
          cardId: card.id,
          text: shortTarget(card) ?? card.back,
        },
      ]),
    ),
  );
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);

  if (matched.size >= pairs.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pairs.length}
        score={Math.max(0, pairs.length - misses)}
        template="matching-pairs"
      />
    );
  }

  return (
    <PlayShell
      extra={`${misses} misses`}
      maxScore={pairs.length}
      score={matched.size}
      title="Matching pairs"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => {
          const show = open.includes(tile.id) || matched.has(tile.cardId);
          return (
            <button
              className={`min-h-24 rounded-2xl border p-3 text-sm font-semibold ${
                matched.has(tile.cardId)
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : show
                    ? "border-[var(--accent)] bg-[var(--secondary)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
              }`}
              disabled={show}
              key={tile.id}
              onClick={() => {
                if (open.length === 1) {
                  const first = tiles.find((item) => item.id === open[0]);
                  if (first?.cardId === tile.cardId && first.id !== tile.id) {
                    setMatched(new Set(matched).add(tile.cardId));
                    setOpen([]);
                  } else {
                    setOpen([open[0]!, tile.id]);
                    setMisses((value) => value + 1);
                    window.setTimeout(() => setOpen([]), 650);
                  }
                } else {
                  setOpen([tile.id]);
                }
              }}
              type="button"
            >
              {show ? tile.text : "?"}
            </button>
          );
        })}
      </div>
    </PlayShell>
  );
}

export function FindTheMatchGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const [pool] = useState(() => takePairs(cards, 10));
  const [remaining, setRemaining] = useState(pool);
  const [prompt, setPrompt] = useState(pool[0]!);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  if (remaining.length === 0) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={Math.max(0, pool.length - misses)}
        template="find-the-match"
      />
    );
  }

  return (
    <PlayShell
      maxScore={pool.length}
      score={pool.length - remaining.length}
      title="Find the match"
    >
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="eyebrow">Prompt</p>
        <h2 className="mt-2 text-xl font-bold">{promptText(prompt)}</h2>
      </div>
      <div className="grid gap-2">
        {remaining.map((card) => (
          <button
            className="tcg-choice"
            disabled={feedback !== null}
            key={card.id}
            onClick={() => {
              const ok = card.id === prompt.id;
              setFeedback(ok);
              if (!ok) setMisses((value) => value + 1);
            }}
            type="button"
          >
            {shortTarget(card) ?? card.back}
          </button>
        ))}
      </div>
      {feedback !== null ? (
        <WhyBox
          ok={feedback}
          onContinue={() => {
            if (feedback) {
              const next = remaining.filter((card) => card.id !== prompt.id);
              setRemaining(next);
              setPrompt(next[0] ?? prompt);
            }
            setFeedback(null);
          }}
          why={quizExplanation(prompt)}
        />
      ) : null}
    </PlayShell>
  );
}
