"use client";

import { useEffect, useMemo, useState } from "react";

import { gradeTypedAnswerAction } from "@/lib/actions/games";
import { shortTarget, typedMatches } from "@/lib/play/answers";
import type { Flashcard } from "@/lib/types/flashcard";

import { isPublicPlayCatalog } from "@/lib/play/templates";
import { InkStoneSvg } from "./play-art";
import { missWhy, promptOf, takeChips } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

const DRY_MS = 18_000;

export function TypeAnswerGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  if (isPublicPlayCatalog()) {
    return <TypeAnswerStudy cards={cards} deckId={deckId} />;
  }
  return <TypeAnswerInkWell cards={cards} deckId={deckId} />;
}

function TypeAnswerStudy({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [source, setSource] = useState<"exact" | "ai" | "reject" | null>(null);
  const [checking, setChecking] = useState(false);
  const card = pool[index];

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="type-the-answer"
      />
    );
  }

  function finishMiss(message: string) {
    setFeedback(false);
    setSource("reject");
    setWhy(message);
  }

  function finishHit(nextSource: "exact" | "ai", message?: string | null) {
    setFeedback(true);
    setSource(nextSource);
    setWhy(message ?? null);
    setScore((n) => n + 1);
  }

  return (
    <PlayShell
      clock={false}
      maxScore={pool.length}
      score={score}
      skin="spell"
      title="Type the answer"
    >
      <div className="play-board">
        <p className="play-muted">
          {index + 1} / {pool.length}
        </p>
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="mx-auto mt-3 max-h-40 rounded-2xl object-contain"
            src={card.imageUrl}
          />
        ) : null}
        <h2 className="play-prompt mb-0 mt-3">{promptOf(card)}</h2>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (feedback !== null || checking) return;
          const typed = value.trim();
          if (!typed) return;
          if (typedMatches(typed, card)) {
            finishHit("exact");
            return;
          }
          setChecking(true);
          void gradeTypedAnswerAction({
            deckId,
            cardId: card.id,
            typed,
          })
            .then((result) => {
              if (result.ok) {
                finishHit(
                  result.source === "ai" ? "ai" : "exact",
                  result.source === "ai" ? (result.why || missWhy(card)) : null,
                );
                return;
              }
              finishMiss(missWhy(card));
            })
            .catch(() => {
              finishMiss(shortTarget(card) ?? missWhy(card));
            })
            .finally(() => setChecking(false));
        }}
      >
        <input
          autoCapitalize="off"
          autoComplete="off"
          className="play-input"
          disabled={feedback !== null || checking}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type the answer"
          value={value}
        />
        {feedback === null ? (
          <button
            className="primary-button"
            disabled={checking || !value.trim()}
            type="submit"
          >
            {checking ? "Checking…" : "Check"}
          </button>
        ) : (
          <WhyBox
            ok={feedback}
            onContinue={() => {
              setFeedback(null);
              setWhy(null);
              setSource(null);
              setValue("");
              setIndex((n) => n + 1);
            }}
            source={source ?? undefined}
            why={why}
          />
        )}
      </form>
    </PlayShell>
  );
}

function TypeAnswerInkWell({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [source, setSource] = useState<"exact" | "ai" | "reject" | null>(null);
  const [checking, setChecking] = useState(false);
  const [dried, setDried] = useState(false);
  const card = pool[index];

  useEffect(() => {
    const id = window.setTimeout(() => setDried(true), DRY_MS);
    return () => window.clearTimeout(id);
  }, [index]);

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="type-the-answer"
      />
    );
  }

  function finishMiss(message: string) {
    setFeedback(false);
    setSource("reject");
    setWhy(message);
  }

  function finishHit(nextSource: "exact" | "ai", message?: string | null) {
    setFeedback(true);
    setSource(nextSource);
    setWhy(message ?? null);
    setScore((n) => n + 1);
  }

  return (
    <PlayShell
      clock={false}
      extra={dried ? "dried" : "ink wet"}
      maxScore={pool.length}
      score={score}
      skin="spell"
      title="Ink well"
    >
      <div className="play-board play-ink-well">
        <InkStoneSvg />
        <p className="play-muted">
          {index + 1} / {pool.length}
        </p>
        <div className={`play-ink-drop ${dried ? "is-dry" : ""}`} aria-hidden />
        <h2 className="play-prompt mb-0 mt-3">{promptOf(card)}</h2>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (feedback !== null || checking) return;
          const typed = value.trim();
          if (!typed) return;
          if (dried) {
            finishMiss(missWhy(card));
            return;
          }
          if (typedMatches(typed, card)) {
            finishHit("exact");
            return;
          }
          setChecking(true);
          void gradeTypedAnswerAction({
            deckId,
            cardId: card.id,
            typed,
          })
            .then((result) => {
              if (result.ok) {
                finishHit(
                  result.source === "ai" ? "ai" : "exact",
                  result.source === "ai" ? (result.why || missWhy(card)) : null,
                );
                return;
              }
              finishMiss(missWhy(card));
            })
            .catch(() => {
              finishMiss(shortTarget(card) ?? missWhy(card));
            })
            .finally(() => setChecking(false));
        }}
      >
        <input
          autoCapitalize="off"
          autoComplete="off"
          className="play-input"
          disabled={feedback !== null || checking}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write the term"
          value={value}
        />
        {feedback === null ? (
          <button
            className="primary-button"
            disabled={checking || !value.trim()}
            type="submit"
          >
            {checking ? "Checking…" : "Chop"}
          </button>
        ) : (
          <WhyBox
            ok={feedback}
            onContinue={() => {
              setFeedback(null);
              setWhy(null);
              setSource(null);
              setValue("");
              setDried(false);
              setIndex((n) => n + 1);
            }}
            source={source ?? undefined}
            why={why}
          />
        )}
      </form>
    </PlayShell>
  );
}
