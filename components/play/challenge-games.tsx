"use client";

import { useMemo, useState } from "react";

import {
  gameshowPoints,
  promptText,
  shortTarget,
} from "@/lib/play/answers";
import { buildQuizChoices, quizExplanation, resolveCorrectChoice } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

function McqGame({
  cards,
  deckId,
  template,
  title,
  lives,
  points,
  imageOnly,
}: {
  cards: Flashcard[];
  deckId: string;
  template:
    | "image-quiz"
    | "gameshow-quiz"
    | "win-or-lose"
    | "open-the-box"
    | "whack-a-mole"
    | "balloon-pop";
  title: string;
  lives?: number;
  points?: boolean;
  imageOnly?: boolean;
}) {
  const pool = useMemo(() => {
    const source = imageOnly
      ? cards.filter((card) => card.imageUrl)
      : cards;
    return shuffleList(source).slice(0, 12);
  }, [cards, imageOnly]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [remainingLives, setRemainingLives] = useState(lives ?? 99);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [opened, setOpened] = useState(template !== "open-the-box");
  const card = pool[index];
  const maxScore = points
    ? pool.reduce((sum, item) => sum + gameshowPoints(item), 0)
    : pool.length;

  if (!card || index >= pool.length || remainingLives <= 0) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={maxScore}
        score={score}
        template={template}
      />
    );
  }

  const choices = imageOnly
    ? shuffleList(
        [
          shortTarget(card) ?? card.back,
          ...shuffleList(pool.filter((item) => item.id !== card.id))
            .slice(0, 3)
            .map((item) => shortTarget(item) ?? item.back),
        ].filter((item, i, all) => all.indexOf(item) === i),
      )
    : buildQuizChoices(card, pool);
  const correct = imageOnly
    ? (shortTarget(card) ?? card.back)
    : resolveCorrectChoice(card);

  return (
    <PlayShell
      extra={lives ? `${remainingLives} lives` : undefined}
      maxScore={maxScore}
      score={score}
      title={title}
    >
      {template === "open-the-box" && !opened ? (
        <div className="grid grid-cols-3 gap-3">
          {pool.map((item, i) => (
            <button
              className="flex min-h-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--secondary)] font-bold"
              key={item.id}
              onClick={() => {
                setIndex(i);
                setOpened(true);
              }}
              type="button"
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : (
        <>
          {imageOnly && card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="mx-auto max-h-56 rounded-3xl object-contain"
              src={card.imageUrl}
            />
          ) : (
            <h2 className="text-xl font-bold">{promptText(card)}</h2>
          )}
          <div
            className={
              template === "balloon-pop"
                ? "flex flex-wrap justify-center gap-3"
                : "grid gap-2"
            }
          >
            {choices.map((choice) => (
              <button
                className={
                  template === "balloon-pop"
                    ? "flex h-24 w-24 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--secondary)] px-2 text-center text-xs font-bold"
                    : "tcg-choice"
                }
                disabled={feedback !== null}
                key={choice}
                onClick={() => {
                  const ok =
                    choice.trim().toLowerCase() === correct.trim().toLowerCase();
                  setFeedback(ok);
                  if (ok) {
                    setScore((n) => n + (points ? gameshowPoints(card) : 1));
                  } else if (lives) {
                    setRemainingLives((n) => n - 1);
                  }
                }}
                type="button"
              >
                {choice}
              </button>
            ))}
          </div>
          {feedback !== null ? (
            <WhyBox
              ok={feedback}
              onContinue={() => {
                setFeedback(null);
                if (template === "open-the-box") {
                  const next = pool.findIndex(
                    (item, i) => i !== index && i > index,
                  );
                  if (next === -1) setIndex(pool.length);
                  else {
                    setIndex(next);
                    setOpened(false);
                  }
                } else {
                  setIndex((n) => n + 1);
                }
              }}
              why={quizExplanation(card)}
            />
          ) : null}
        </>
      )}
    </PlayShell>
  );
}

export function ImageQuizGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame
      {...props}
      imageOnly
      template="image-quiz"
      title="Image quiz"
    />
  );
}

export function GameshowQuizGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame
      {...props}
      points
      template="gameshow-quiz"
      title="Gameshow quiz"
    />
  );
}

export function WinOrLoseGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame
      {...props}
      lives={3}
      template="win-or-lose"
      title="Win or lose quiz"
    />
  );
}

export function OpenTheBoxGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame {...props} template="open-the-box" title="Open the box" />
  );
}

export function WhackAMoleGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame {...props} template="whack-a-mole" title="Whack-a-mole" />
  );
}

export function BalloonPopGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame {...props} template="balloon-pop" title="Balloon pop" />
  );
}
