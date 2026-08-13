"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  gameshowPoints,
  promptText,
  shortTarget,
} from "@/lib/play/answers";
import { playBeep } from "@/lib/play/juice";
import { buildQuizChoices, quizExplanation, resolveCorrectChoice } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import {
  BALLOON_COLORS,
  BalloonSvg,
  ChestSvg,
  MoleSvg,
} from "./play-art";
import { PlayFinished, PlayShell, WhyBox, usePlayJuice } from "./play-shell";

function choiceList(card: Flashcard, pool: Flashcard[], imageOnly: boolean) {
  if (imageOnly) {
    return shuffleList(
      [
        shortTarget(card) ?? card.back,
        ...shuffleList(pool.filter((item) => item.id !== card.id))
          .slice(0, 3)
          .map((item) => shortTarget(item) ?? item.back),
      ].filter((item, i, all) => all.indexOf(item) === i),
    );
  }
  return buildQuizChoices(card, pool);
}

export function WhackAMoleGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => shuffleList(cards).slice(0, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const card = pool[index];
  const moles = useMemo(() => {
    if (!card) return [];
    const others = shuffleList(pool.filter((item) => item.id !== card.id)).slice(0, 3);
    return shuffleList([card, ...others]);
  }, [card, pool]);

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="whack-a-mole"
      />
    );
  }

  return (
    <PlayShell
      combo={combo}
      maxScore={pool.length}
      score={score}
      skin="mole"
      title="Whack-a-mole"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <MoleField
        card={card}
        key={index}
        moles={moles}
        onResult={(ok) => {
          setCombo((n) => (ok ? n + 1 : 0));
          if (ok) setScore((n) => n + 1);
          window.setTimeout(() => setIndex((n) => n + 1), 420);
        }}
      />
    </PlayShell>
  );
}

function MoleField({
  card,
  moles,
  onResult,
}: {
  card: Flashcard;
  moles: Flashcard[];
  onResult: (ok: boolean) => void;
}) {
  const juice = usePlayJuice();
  const addTime = juice.addTime;
  const [up, setUp] = useState<number[]>([]);
  const [hit, setHit] = useState<number | null>(null);
  const hitRef = useRef(false);
  const onResultRef = useRef(onResult);
  useLayoutEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    hitRef.current = false;
    const correct = moles.findIndex((mole) => mole.id === card.id);
    if (correct < 0) return;
    let tick = 0;
    let lastCorrect = false;
    const pop = () => {
      if (hitRef.current) return;
      if (lastCorrect) {
        playBeep("miss");
        addTime(-3);
        onResultRef.current(false);
        return;
      }
      const showCorrect = tick % 2 === 0;
      const others = moles.map((_, i) => i).filter((i) => i !== correct);
      const other = others[tick % Math.max(others.length, 1)] ?? correct;
      lastCorrect = showCorrect;
      setUp(showCorrect ? [correct] : [other]);
      tick += 1;
    };
    const first = window.setTimeout(pop, 0);
    const id = window.setInterval(pop, 850);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [card, moles, addTime]);

  return (
    <div className="play-mole-field">
      {moles.map((mole, i) => (
        <button
          className={`play-hole ${up.includes(i) ? "is-up" : ""}`}
          key={`${mole.id}-${i}`}
          onClick={() => {
            if (hit !== null) return;
            const ok = mole.id === card.id;
            hitRef.current = true;
            setHit(i);
            playBeep(ok ? "hit" : "miss");
            if (!ok) addTime(-3);
            onResult(ok);
          }}
          type="button"
        >
          <span className="play-mole">
            <MoleSvg squash={hit === i} />
          </span>
          <span className="play-mole-label">
            {(shortTarget(mole) ?? mole.back).slice(0, 32)}
          </span>
          <span className="play-hole-dirt" />
        </button>
      ))}
    </div>
  );
}

export function BalloonPopGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => shuffleList(cards).slice(0, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const card = pool[index];
  const balloons = useMemo(() => {
    if (!card) return [];
    const others = shuffleList(pool.filter((item) => item.id !== card.id)).slice(0, 3);
    return shuffleList([card, ...others]);
  }, [card, pool]);

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="balloon-pop"
      />
    );
  }

  return (
    <PlayShell
      combo={combo}
      maxScore={pool.length}
      score={score}
      skin="balloon"
      title="Balloon pop"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <BalloonField
        balloons={balloons}
        card={card}
        key={index}
        onResult={(ok) => {
          setCombo((n) => (ok ? n + 1 : 0));
          if (ok) setScore((n) => n + 1);
          window.setTimeout(() => setIndex((n) => n + 1), 380);
        }}
      />
    </PlayShell>
  );
}

function BalloonField({
  balloons,
  card,
  onResult,
}: {
  balloons: Flashcard[];
  card: Flashcard;
  onResult: (ok: boolean) => void;
}) {
  const juice = usePlayJuice();
  const addTime = juice.addTime;
  const [popped, setPopped] = useState<number | null>(null);
  const poppedRef = useRef(false);
  const onResultRef = useRef(onResult);
  useLayoutEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    poppedRef.current = false;
    const id = window.setTimeout(() => {
      if (poppedRef.current) return;
      playBeep("miss");
      addTime(-3);
      onResultRef.current(false);
    }, 3600);
    return () => window.clearTimeout(id);
  }, [card, addTime]);

  return (
    <div className="play-balloon-sky">
      {balloons.map((balloon, i) => (
        <button
          className="play-balloon-btn"
          key={`${balloon.id}-${i}`}
          onClick={() => {
            if (popped !== null) return;
            const ok = balloon.id === card.id;
            poppedRef.current = true;
            setPopped(i);
            playBeep(ok ? "hit" : "miss");
            if (!ok) addTime(-3);
            onResult(ok);
          }}
          type="button"
        >
          <BalloonSvg
            color={BALLOON_COLORS[i % BALLOON_COLORS.length]!}
            popped={popped === i}
          />
          <span className="play-balloon-label">
            {(shortTarget(balloon) ?? balloon.back).slice(0, 24)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function OpenTheBoxGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => shuffleList(cards).slice(0, 9), [cards]);
  const [opened, setOpened] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const card = opened === null ? null : pool[opened];

  if (done.length >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="open-the-box"
      />
    );
  }

  return (
    <PlayShell
      maxScore={pool.length}
      score={score}
      skin="chest"
      title="Open the box"
    >
      {card && opened !== null ? (
        <>
          <p className="play-prompt">{promptText(card)}</p>
          <div className="grid gap-2">
            {buildQuizChoices(card, pool).map((choice) => (
              <button
                className="play-choice"
                disabled={feedback !== null}
                key={choice}
                onClick={() => {
                  const ok =
                    choice.trim().toLowerCase() ===
                    resolveCorrectChoice(card).trim().toLowerCase();
                  setFeedback(ok);
                  if (ok) setScore((n) => n + 1);
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
                setDone((list) => [...list, opened]);
                setOpened(null);
                setFeedback(null);
              }}
              why={quizExplanation(card)}
            />
          ) : null}
        </>
      ) : (
        <div className="play-chest-grid">
          {pool.map((item, i) => (
            <button
              className="play-chest-btn"
              disabled={done.includes(i)}
              key={item.id}
              onClick={() => setOpened(i)}
              type="button"
            >
              <ChestSvg open={done.includes(i)} />
            </button>
          ))}
        </div>
      )}
    </PlayShell>
  );
}

function McqGame({
  cards,
  deckId,
  template,
  title,
  lives,
  points,
  imageOnly,
  skin,
}: {
  cards: Flashcard[];
  deckId: string;
  template: "image-quiz" | "gameshow-quiz" | "win-or-lose";
  title: string;
  lives?: number;
  points?: boolean;
  imageOnly?: boolean;
  skin: "gallery" | "neon" | "arena";
}) {
  const pool = useMemo(() => {
    const source = imageOnly ? cards.filter((card) => card.imageUrl) : cards;
    return shuffleList(source).slice(0, 12);
  }, [cards, imageOnly]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [remainingLives, setRemainingLives] = useState(lives ?? 99);
  const [feedback, setFeedback] = useState<boolean | null>(null);
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

  const choices = choiceList(card, pool, Boolean(imageOnly));
  const correct = imageOnly
    ? (shortTarget(card) ?? card.back)
    : resolveCorrectChoice(card);

  return (
    <PlayShell
      lives={lives ? remainingLives : undefined}
      maxScore={maxScore}
      score={score}
      skin={skin}
      title={title}
    >
      {imageOnly && card.imageUrl ? (
        <div className="play-polaroid mx-auto mb-4 max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={card.imageUrl} />
        </div>
      ) : (
        <p className="play-prompt">{promptText(card)}</p>
      )}
      <div className="grid gap-2">
        {choices.map((choice, i) => (
          <button
            className={skin === "neon" ? "play-choice play-choice--neon" : "play-choice"}
            disabled={feedback !== null}
            key={choice}
            onClick={() => {
              const ok =
                choice.trim().toLowerCase() === correct.trim().toLowerCase();
              setFeedback(ok);
              if (ok) setScore((n) => n + (points ? gameshowPoints(card) : 1));
              else if (lives) setRemainingLives((n) => n - 1);
            }}
            type="button"
          >
            <span className="play-choice-letter">{String.fromCharCode(65 + i)}</span>
            {choice}
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
          why={quizExplanation(card)}
        />
      ) : null}
    </PlayShell>
  );
}

export function ImageQuizGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame {...props} imageOnly skin="gallery" template="image-quiz" title="Image quiz" />
  );
}

export function GameshowQuizGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame {...props} points skin="neon" template="gameshow-quiz" title="Gameshow quiz" />
  );
}

export function WinOrLoseGame(props: { cards: Flashcard[]; deckId: string }) {
  return (
    <McqGame
      {...props}
      lives={3}
      skin="arena"
      template="win-or-lose"
      title="Win or lose"
    />
  );
}
