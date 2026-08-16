"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { promptText } from "@/lib/play/answers";
import { playBeep } from "@/lib/play/juice";
import { buildQuizChoices, quizExplanation } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { LateSlipSvg, MoleSvg } from "./play-art";
import { chipOf, missWhy, mixWithDecoys, takeChips } from "./play-kit";
import { PlayFinished, PlayShell, WhyBox, usePlayJuice } from "./play-shell";

export function WinOrLoseGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const choicesById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const card of pool) {
      const all = buildQuizChoices(card, pool);
      const correct =
        all.find((entry) => entry.trim().toLowerCase() === card.back.trim().toLowerCase()) ??
        card.back;
      const rest = all.filter((entry) => entry !== correct).slice(0, 2);
      map.set(card.id, shuffleList([correct, ...rest].slice(0, 3)));
    }
    return map;
  }, [pool]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const card = pool[index];
  const choices = card ? (choicesById.get(card.id) ?? []) : [];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (feedback !== null) return;
      const slot = { a: 0, b: 1, c: 2, A: 0, B: 1, C: 2 }[event.key];
      if (slot === undefined || !choices[slot]) return;
      event.preventDefault();
      pick(choices[slot]!);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pick(choice: string) {
    if (!card || feedback !== null) return;
    const hit = choice.trim().toLowerCase() === card.back.trim().toLowerCase();
    setFeedback(hit);
    if (hit) {
      setStreak((n) => n + 1);
      setScore((n) => n + 1);
    } else {
      setStreak(0);
      setLives((n) => n - 1);
    }
  }

  if (!card || index >= pool.length || lives <= 0) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="win-or-lose"
      />
    );
  }

  return (
    <PlayShell
      clock={false}
      combo={streak}
      lives={lives}
      maxScore={pool.length}
      score={score}
      skin="arena"
      title="Detention hall"
    >
      <p className="play-muted">Three late slips. Keys A–C.</p>
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-slip-row">
        {choices.map((choice, i) => (
          <button
            className="play-choice play-sprite play-slip"
            disabled={feedback !== null}
            key={`${card.id}-${choice}`}
            onClick={() => pick(choice)}
            type="button"
          >
            <LateSlipSvg letter={String.fromCharCode(65 + i)} />
            <span className="play-choice-text play-sprite-label">{choice}</span>
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
          why={feedback ? quizExplanation(card) : missWhy(card)}
        />
      ) : null}
    </PlayShell>
  );
}

export function WhackAMoleGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(() => takeChips(cards, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const card = pool[index];
  const desks = useMemo(() => {
    if (!card) return [];
    const mixed = mixWithDecoys(card, pool, 3);
    while (mixed.length < 4 && pool[mixed.length]) mixed.push(pool[mixed.length]!);
    return mixed.slice(0, 4);
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
      clock={75}
      combo={combo}
      maxScore={pool.length}
      score={score}
      skin="mole"
      title="Pop-quiz desks"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <DeskField
        card={card}
        desks={desks}
        key={index}
        onResult={(ok) => {
          setCombo((n) => (ok ? n + 1 : 0));
          if (ok) setScore((n) => n + 1);
          window.setTimeout(() => setIndex((n) => n + 1), 420);
        }}
      />
    </PlayShell>
  );
}

function DeskField({
  card,
  desks,
  onResult,
}: {
  card: Flashcard;
  desks: Flashcard[];
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
    if (!juice.started) return;
    hitRef.current = false;
    const correct = desks.findIndex((desk) => desk.id === card.id);
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
      const others = desks.map((_, i) => i).filter((i) => i !== correct);
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
  }, [card, desks, addTime, juice.started]);

  return (
    <div className="play-mole-field">
      {desks.map((desk, i) => {
        const standing = up.includes(i);
        return (
          <button
            className={`play-hole ${standing ? "is-up" : ""}`}
            key={`${desk.id}-${i}`}
            onClick={() => {
              if (hit !== null || !standing) return;
              const ok = desk.id === card.id;
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
            {standing ? (
              <span className="play-mole-label play-chip">{chipOf(desk)}</span>
            ) : (
              <span className="play-mole-label is-seated"> </span>
            )}
            <span className="play-hole-dirt" />
          </button>
        );
      })}
    </div>
  );
}
