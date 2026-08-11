"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { FlashCard } from "@/components/flash-card";
import {
  rateCardAction,
  restartStudyAction,
} from "@/lib/actions/study";
import { useSwipe } from "@/lib/hooks/use-swipe";
import type {
  CardRating,
  Flashcard,
  StudySession,
} from "@/lib/types/flashcard";

function playTone(frequency: number, muted: boolean) {
  if (muted) return;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
}

function answersMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function StudyPlayer({
  deckId,
  cards,
  initialSession,
  readOnly = false,
}: {
  deckId: string;
  cards: Flashcard[];
  initialSession?: StudySession;
  readOnly?: boolean;
}) {
  const t = useTranslations("study");
  const orderedCards = useMemo(() => {
    if (!initialSession) return cards;
    const byId = new Map(cards.map((card) => [card.id, card]));
    return initialSession.cardOrder
      .map((id) => byId.get(id))
      .filter((card): card is Flashcard => Boolean(card));
  }, [cards, initialSession]);
  const [index, setIndex] = useState(initialSession?.currentIndex ?? 0);
  const [viewIndex, setViewIndex] = useState(index);
  const [flipped, setFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const completed = index >= orderedCards.length;
  const card = orderedCards[Math.min(viewIndex, orderedCards.length - 1)];
  const isMcq = card?.cardType === "mcq" && Boolean(card.options?.length);
  const mcqReady = !isMcq || selectedOption != null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMuted(localStorage.getItem("study-a-muted") === "true");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault();
        if (isMcq && !selectedOption) return;
        setFlipped((value) => !value);
      }
      if (event.key === "ArrowLeft") {
        setViewIndex((value) => Math.max(0, value - 1));
        setFlipped(false);
        setSelectedOption(null);
      }
      if (event.key === "ArrowRight") {
        setViewIndex((value) => Math.min(index, value + 1));
        setFlipped(false);
        setSelectedOption(null);
      }
      if (
        isMcq &&
        !selectedOption &&
        card?.options &&
        /^[1-4]$/.test(event.key)
      ) {
        const option = card.options[Number(event.key) - 1];
        if (option) {
          setSelectedOption(option);
          setFlipped(true);
          const correct = answersMatch(option, card.back);
          playTone(correct ? 720 : 320, muted);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, isMcq, selectedOption, card, muted]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("study-a-muted", String(next));
  }

  function selectOption(option: string) {
    setSelectedOption(option);
    setFlipped(true);
    const correct = answersMatch(option, card?.back ?? "");
    playTone(correct ? 720 : 320, muted);
  }

  function rate(rating: CardRating) {
    if (!initialSession || !card || viewIndex !== index) return;
    if (isMcq && !selectedOption) return;
    startTransition(async () => {
      const next = await rateCardAction({
        sessionId: initialSession.id,
        cardId: card.id,
        rating,
      });
      playTone(rating === "easy" ? 720 : rating === "ok" ? 520 : 320, muted);
      setIndex(next);
      setViewIndex(next);
      setFlipped(false);
      setSelectedOption(null);
    });
  }

  function restart(shuffled: boolean) {
    if (!initialSession) {
      setIndex(0);
      setViewIndex(0);
      setFlipped(false);
      setSelectedOption(null);
      return;
    }
    startTransition(async () => {
      await restartStudyAction({
        sessionId: initialSession.id,
        deckId,
        shuffled,
      });
      window.location.reload();
    });
  }

  const swipe = useSwipe({
    onSwipeLeft: () => {
      if (viewIndex < index) {
        setViewIndex((value) => value + 1);
        setFlipped(false);
        setSelectedOption(null);
      }
    },
    onSwipeRight: () => {
      if (viewIndex > 0) {
        setViewIndex((value) => value - 1);
        setFlipped(false);
        setSelectedOption(null);
      }
    },
  });

  if (!orderedCards.length) {
    return <p className="empty-state">{t("empty")}</p>;
  }

  if (completed) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-black uppercase tracking-widest text-indigo-600">
          {t("finished", { count: orderedCards.length })}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            className="secondary-button"
            onClick={() => restart(false)}
            type="button"
          >
            {t("restart")}
          </button>
          <button
            className="primary-button"
            onClick={() => restart(true)}
            type="button"
          >
            {t("shuffle")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="study-mobile space-y-6" {...swipe}>
      <div className="flex items-center justify-between text-sm font-bold text-slate-600">
        <span>
          Card {viewIndex + 1} of {orderedCards.length}
        </span>
        <button onClick={toggleMute} type="button">
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
      <p className="text-center text-xs text-slate-500 sm:hidden">
        Swipe left/right to browse · tap options or flip to answer
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-indigo-600 transition-all"
          style={{ width: `${(index / orderedCards.length) * 100}%` }}
        />
      </div>
      <FlashCard
        back={card.back}
        cardType={card.cardType}
        category={card.category}
        flipped={flipped}
        front={card.front}
        hint={card.hint}
        index={viewIndex + 1}
        onFlip={() => {
          if (isMcq && !selectedOption) return;
          setFlipped((value) => !value);
          playTone(440, muted);
        }}
        onSelectOption={selectOption}
        options={card.options}
        selectedOption={selectedOption}
        total={orderedCards.length}
      />
      <div className="study-nav-controls flex flex-wrap items-center justify-center gap-3">
        <button
          className="secondary-button min-w-28"
          disabled={viewIndex === 0}
          onClick={() => {
            setViewIndex((value) => value - 1);
            setFlipped(false);
            setSelectedOption(null);
          }}
          type="button"
        >
          Previous
        </button>
        <button
          className="secondary-button min-w-28"
          disabled={viewIndex >= index}
          onClick={() => {
            setViewIndex((value) => value + 1);
            setFlipped(false);
            setSelectedOption(null);
          }}
          type="button"
        >
          Next
        </button>
      </div>
      {!readOnly && initialSession ? (
        <div className="grid grid-cols-3 gap-3">
          {(["hard", "ok", "easy"] as const).map((rating) => (
            <button
              className={`rating-button rating-${rating}`}
              disabled={isPending || viewIndex !== index || !flipped || !mcqReady}
              key={rating}
              onClick={() => rate(rating)}
              type="button"
            >
              {rating === "hard"
                ? t("hard")
                : rating === "easy"
                  ? t("easy")
                  : t("ok")}
            </button>
          ))}
        </div>
      ) : (
        <button
          className="primary-button mx-auto block"
          onClick={() => {
            const next = Math.min(orderedCards.length, index + 1);
            setIndex(next);
            setViewIndex(next);
            setFlipped(false);
            setSelectedOption(null);
          }}
          type="button"
        >
          {t("nextCard")}
        </button>
      )}
      <div className="flex justify-center gap-3">
        <button
          className="text-button"
          disabled={isPending}
          onClick={() => restart(false)}
          type="button"
        >
          {t("restart")}
        </button>
        <button
          className="text-button"
          disabled={isPending}
          onClick={() => restart(true)}
          type="button"
        >
          {t("shuffle")}
        </button>
      </div>
    </section>
  );
}
