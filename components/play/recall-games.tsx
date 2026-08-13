"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useCardSpeech } from "@/components/flash-card";
import { gradeTypedAnswerAction } from "@/lib/actions/games";
import { clozeBlank, promptText, shortTarget, spellingWord } from "@/lib/play/answers";
import { quizExplanation } from "@/lib/quiz/choices";
import { shuffleList } from "@/lib/study/shuffle";
import type { Flashcard } from "@/lib/types/flashcard";

import { HangmanSvg, MicSvg } from "./play-art";
import { PlayFinished, PlayShell, WhyBox } from "./play-shell";

export function TypeAnswerGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(
    () => shuffleList(cards.filter((card) => shortTarget(card))).slice(0, 12),
    [cards],
  );
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

  return (
    <PlayShell maxScore={pool.length} score={score} skin="spell" title="Type the answer">
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
        <h2 className="play-prompt mb-0 mt-3">{promptText(card)}</h2>
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (feedback !== null || checking) return;
          setChecking(true);
          void gradeTypedAnswerAction({
            deckId,
            cardId: card.id,
            typed: value,
          })
            .then((result) => {
              setFeedback(result.ok);
              setSource(result.source);
              setWhy(
                result.ok
                  ? result.why
                  : `${shortTarget(card) ?? card.back}${result.why ? ` — ${result.why}` : ""}`,
              );
              if (result.ok) setScore((n) => n + 1);
            })
            .catch(() => {
              setFeedback(false);
              setSource("reject");
              setWhy(shortTarget(card) ?? card.back);
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
          placeholder="Type the answer — close counts"
          value={value}
        />
        {feedback === null ? (
          <button className="primary-button" disabled={checking} type="submit">
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

export function SpellWordGame({
  cards,
  deckId,
  mode,
}: {
  cards: Flashcard[];
  deckId: string;
  mode: "spell-the-word" | "unjumble";
}) {
  const pool = useMemo(
    () => shuffleList(cards.filter((card) => spellingWord(card))).slice(0, 10),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const card = pool[index];
  const word = card ? spellingWord(card) : null;
  const [bank, setBank] = useState<string[]>(() =>
    word ? shuffleList(word.split("")) : [],
  );

  if (!card || !word || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template={mode}
      />
    );
  }

  function resetBank(nextWord: string) {
    setBuilt([]);
    setBank(shuffleList(nextWord.split("")));
  }

  return (
    <PlayShell
      maxScore={pool.length}
      score={score}
      title={mode === "unjumble" ? "Unjumble" : "Spell the word"}
      skin="spell"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <p className="play-spell-slots">{built.join("") || "—"}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {bank.map((letter, i) => (
          <button
            className="play-key"
            key={`${letter}-${i}`}
            onClick={() => {
              setBuilt((letters) => [...letters, letter]);
              setBank((letters) => letters.filter((_, idx) => idx !== i));
            }}
            type="button"
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          className="play-choice play-choice--center"
          onClick={() => resetBank(word)}
          type="button"
        >
          Reset
        </button>
        <button
          className="primary-button"
          disabled={built.length !== word.length}
          onClick={() => {
            if (built.join("") === word) setScore((n) => n + 1);
            const nxt = index + 1;
            setIndex(nxt);
            const nextWord = pool[nxt] ? spellingWord(pool[nxt]!) : null;
            if (nextWord) resetBank(nextWord);
          }}
          type="button"
        >
          Check
        </button>
      </div>
    </PlayShell>
  );
}

export function HangmanGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(
    () => shuffleList(cards.filter((card) => spellingWord(card))).slice(0, 8),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const card = pool[index];
  const word = card ? spellingWord(card) : null;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  if (!card || !word || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="hangman"
      />
    );
  }

  const display = word
    .split("")
    .map((letter) => (guessed.has(letter) ? letter : "_"))
    .join(" ");
  const won = word.split("").every((letter) => guessed.has(letter));
  const lost = misses >= 6;

  return (
    <PlayShell
      extra={`${6 - misses} lives`}
      maxScore={pool.length}
      score={score}
      skin="spell"
      title="Hangman"
    >
      <p className="play-prompt">{promptText(card)}</p>
      <div className="play-hang">
        <HangmanSvg misses={misses} />
      </div>
      <p className="play-spell-slots">{display}</p>
      <div className="flex flex-wrap justify-center gap-1">
        {letters.map((letter) => (
          <button
            className="play-key"
            disabled={guessed.has(letter) || won || lost}
            key={letter}
            onClick={() => {
              const next = new Set(guessed).add(letter);
              setGuessed(next);
              if (!word.includes(letter)) setMisses((n) => n + 1);
            }}
            type="button"
          >
            {letter}
          </button>
        ))}
      </div>
      {won || lost ? (
        <WhyBox
          ok={won}
          onContinue={() => {
            if (won) setScore((n) => n + 1);
            setGuessed(new Set());
            setMisses(0);
            setIndex((n) => n + 1);
          }}
          why={lost ? word : quizExplanation(card)}
        />
      ) : null}
    </PlayShell>
  );
}

export function ClozeGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const pool = useMemo(
    () => shuffleList(cards.filter((card) => clozeBlank(card))).slice(0, 10),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const card = pool[index];
  const blank = card ? clozeBlank(card) : null;
  const chips = useMemo(() => {
    const current = pool[index] ? clozeBlank(pool[index]!) : null;
    if (!current) return [];
    const others = shuffleList(
      pool
        .map((item) => clozeBlank(item)?.answer)
        .filter(
          (item): item is string =>
            Boolean(item && item.toLowerCase() !== current.answer.toLowerCase()),
        ),
    ).slice(0, 3);
    return shuffleList([current.answer, ...others]);
  }, [index, pool]);

  if (!card || !blank || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="complete-the-sentence"
      />
    );
  }

  return (
    <PlayShell
      maxScore={pool.length}
      score={score}
      title="Complete the sentence"
      skin="spell"
    >
      <p className="play-prompt">{blank.sentence}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((chip) => (
          <button
            className="play-choice"
            disabled={feedback !== null}
            key={chip}
            onClick={() => {
              const ok = chip.toLowerCase() === blank.answer.toLowerCase();
              setFeedback(ok);
              if (ok) setScore((n) => n + 1);
            }}
            type="button"
          >
            {chip}
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

export function SpeakingCardsGame({
  cards,
  deckId,
}: {
  cards: Flashcard[];
  deckId: string;
}) {
  const t = useTranslations("play");
  const speak = useCardSpeech();
  const pool = useMemo(() => shuffleList(cards).slice(0, 12), [cards]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = pool[index];

  if (!card || index >= pool.length) {
    return (
      <PlayFinished
        deckId={deckId}
        maxScore={pool.length}
        score={score}
        template="speaking-cards"
      />
    );
  }

  return (
    <PlayShell maxScore={pool.length} score={score} skin="talk" title="Speaking cards">
      <p className="play-muted">{t("sayAloud")}</p>
      <div className="play-talk-card">
        <MicSvg />
        <p className="play-prompt mb-0">{promptText(card)}</p>
        {revealed ? (
          <p className="mt-4 text-lg font-bold">{shortTarget(card) ?? card.back}</p>
        ) : null}
      </div>
      <button
        className="secondary-button mt-4"
        onClick={() => void speak(promptText(card))}
        type="button"
      >
        {t("speak")}
      </button>
      {!revealed ? (
        <button
          className="primary-button mt-4"
          onClick={() => setRevealed(true)}
          type="button"
        >
          {t("reveal")}
        </button>
      ) : (
        <div className="mt-4 flex justify-center gap-3">
          <button
            className="secondary-button"
            onClick={() => {
              setRevealed(false);
              setIndex((n) => n + 1);
            }}
            type="button"
          >
            {t("miss")}
          </button>
          <button
            className="primary-button"
            onClick={() => {
              setScore((n) => n + 1);
              setRevealed(false);
              setIndex((n) => n + 1);
            }}
            type="button"
          >
            {t("gotIt")}
          </button>
        </div>
      )}
    </PlayShell>
  );
}
