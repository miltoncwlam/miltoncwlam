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
      skin="match"
      title="Match up"
    >
      <p className="play-prompt">Tap a prompt, then its twin.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {left.map((card) => (
            <button
              className={`play-choice w-full ${
                matched.has(card.id)
                  ? "is-done"
                  : picked === card.id
                    ? "is-picked"
                    : ""
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
              className={`play-choice w-full ${matched.has(card.id) ? "is-done" : ""}`}
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
      skin="flip"
      title="Matching pairs"
    >
      <div className="play-flip-grid">
        {tiles.map((tile) => {
          const show = open.includes(tile.id) || matched.has(tile.cardId);
          return (
            <button
              className={`play-flip ${show ? "is-open" : ""} ${matched.has(tile.cardId) ? "is-matched" : ""}`}
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
              <span className="play-flip-inner">
                <span className="play-flip-face play-flip-back">★</span>
                <span className="play-flip-face play-flip-front">{tile.text}</span>
              </span>
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
      skin="match"
      title="Find the match"
    >
      <p className="play-prompt">{promptText(prompt)}</p>
      <div className="grid gap-2">
        {remaining.map((card) => (
          <button
            className="play-choice"
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
