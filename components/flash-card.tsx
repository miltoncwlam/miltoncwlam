"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";
import { formatImageCredit, type ImageAttribution } from "@/lib/images/license";
import type { CardType } from "@/lib/types/flashcard";

function renderClozeFront(front: string) {
  const parts = front.split(/\{\{blank\}\}/gi);
  if (parts.length === 1) return front;
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <span className="tcg-blank">&nbsp;&nbsp;&nbsp;&nbsp;</span>
          ) : null}
        </span>
      ))}
    </>
  );
}

function typeMeta(cardType: CardType) {
  switch (cardType) {
    case "definition":
      return { label: "TERM", element: "psychic", hp: "80" };
    case "cloze":
      return { label: "CLOZE", element: "water", hp: "70" };
    case "mcq":
      return { label: "QUIZ", element: "fighting", hp: "90" };
    default:
      return { label: "BASIC", element: "grass", hp: "60" };
  }
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

export function useCardSpeech() {
  const locale = useLocale() as AppLocale;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const activeTextRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function speak(text: string) {
    const trimmed = text.trim();
    if (typeof window === "undefined" || !trimmed) return;
    // Extra clicks while the same line is loading or playing must not queue.
    if (busyRef.current && activeTextRef.current === trimmed) return;

    generationRef.current += 1;
    const generation = generationRef.current;
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    activeTextRef.current = trimmed;
    busyRef.current = true;
    setBusy(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, locale }),
        signal: abort.signal,
      });
      if (!response.ok || generation !== generationRef.current) return;

      const blob = await response.blob();
      if (generation !== generationRef.current) return;

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      const finish = () => {
        if (generation !== generationRef.current) return;
        if (objectUrlRef.current === url) {
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
        }
        audioRef.current = null;
        busyRef.current = false;
        activeTextRef.current = null;
        setBusy(false);
      };
      audio.onended = finish;
      audio.onerror = finish;
      await audio.play();
    } catch {
      if (generation === generationRef.current) {
        busyRef.current = false;
        activeTextRef.current = null;
        setBusy(false);
      }
    }
  }

  return { speak, busy };
}

export function FlashCard({
  front,
  back,
  hint,
  category,
  cardType = "qa",
  options,
  imageUrl,
  imageAttribution,
  flipped,
  onFlip,
  index = 1,
  total = 1,
  selectedOption = null,
  onSelectOption,
}: {
  front: string;
  back: string;
  hint?: string | null;
  category?: string | null;
  cardType?: CardType;
  options?: string[] | null;
  imageUrl?: string | null;
  imageAttribution?: ImageAttribution | null;
  flipped: boolean;
  onFlip: () => void;
  index?: number;
  total?: number;
  selectedOption?: string | null;
  onSelectOption?: (option: string) => void;
}) {
  const t = useTranslations("study");
  const credit = formatImageCredit(imageAttribution);
  const { speak, busy } = useCardSpeech();
  const cardKey = `${index}\0${front}\0${back}`;
  const [hintState, setHintState] = useState({ key: cardKey, open: false });
  if (hintState.key !== cardKey) {
    setHintState({ key: cardKey, open: false });
  }
  const hintOpen = hintState.key === cardKey && hintState.open;
  const meta = typeMeta(cardType);
  const isMcq = cardType === "mcq" && Boolean(options?.length);
  const answered = selectedOption != null;
  const correct =
    answered &&
    (normalizeAnswer(selectedOption) === normalizeAnswer(back) ||
      options?.some(
        (option) =>
          normalizeAnswer(option) === normalizeAnswer(back) &&
          normalizeAnswer(option) === normalizeAnswer(selectedOption),
      ));

  return (
    <div className="mx-auto w-full max-w-md space-y-3 text-left">
      <div className="card-scene">
        <button
          aria-label={flipped ? "Show question" : "Show answer"}
          aria-pressed={flipped}
          className="block h-full w-full text-left"
          disabled={isMcq && !answered && !flipped}
          onClick={() => {
            if (isMcq && !answered) return;
            onFlip();
          }}
          type="button"
        >
          <span className={`study-card ${flipped ? "is-flipped" : ""}`}>
            <span className={`study-card-face study-card-front tcg-${meta.element}`}>
              <span className="tcg-top">
                <span className="tcg-name">{category || meta.label}</span>
                <span className="tcg-hp">
                  HP <strong>{meta.hp}</strong>
                </span>
              </span>
              <span className="tcg-art">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full rounded-[0.55rem] object-cover"
                    src={imageUrl}
                  />
                ) : (
                  <>
                    <span className="tcg-art-badge">{meta.label}</span>
                    <span className="tcg-art-mark" aria-hidden>
                      {index % 5 === 0 ? "◆" : index % 3 === 0 ? "★" : "●"}
                    </span>
                  </>
                )}
              </span>
              <span className="tcg-stage">
                Stage {index}/{total} ·{" "}
                {index % 5 === 0
                  ? "Legendary"
                  : index % 3 === 0
                    ? "Rare"
                    : "Common"}
              </span>
              <span className="card-content tcg-move">
                {cardType === "cloze" ? renderClozeFront(front) : front}
              </span>
              <span className="card-instruction">
                {isMcq && !answered
                  ? "Choose an answer below"
                  : flipped
                    ? "Tap for question"
                    : "Tap to flip"}
              </span>
            </span>

            <span
              className={`study-card-face study-card-back tcg-${meta.element}-back`}
            >
              <span className="tcg-top">
                <span className="tcg-name">Answer</span>
                <span className="tcg-hp">
                  XP <strong>+10</strong>
                </span>
              </span>
              <span className="tcg-art tcg-art-answer">
                <span className="tcg-art-badge">REVEAL</span>
              </span>
              <span className="card-content tcg-move">{back}</span>
              {answered ? (
                <span className="card-hint tcg-weakness">
                  {correct ? "Correct" : `Your pick: ${selectedOption}`}
                </span>
              ) : null}
              <span className="card-instruction">Tap for question</span>
            </span>
          </span>
        </button>
      </div>
      {credit ? (
        <p className="text-center text-[11px] text-muted-foreground">{credit}</p>
      ) : null}

      {hint && hintOpen ? (
        <p className="card-hint tcg-weakness">{hint}</p>
      ) : null}

      <div className="study-card-controls flex flex-wrap items-center justify-center gap-3">
        {hint ? (
          <Button
            onClick={() =>
              setHintState((state) => ({
                key: cardKey,
                open: state.key === cardKey ? !state.open : true,
              }))
            }
            type="button"
            variant="secondary"
          >
            {hintOpen ? t("hideHint") : t("showHint")}
          </Button>
        ) : null}
        <Button
          disabled={busy}
          onClick={() => speak(flipped ? back : front)}
          type="button"
          variant="secondary"
        >
          {flipped ? t("speakAnswer") : t("speakPrompt")}
        </Button>
      </div>

      {isMcq && options?.length ? (
        <ul className="space-y-2">
          {options.map((option, optionIndex) => {
            const isSelected = selectedOption === option;
            const isCorrectOption =
              normalizeAnswer(option) === normalizeAnswer(back);
            let tone =
              "border-slate-200 bg-white text-slate-800 hover:border-indigo-300";
            if (answered && isCorrectOption) {
              tone = "border-emerald-400 bg-emerald-50 text-emerald-900";
            } else if (answered && isSelected && !isCorrectOption) {
              tone = "border-rose-400 bg-rose-50 text-rose-900";
            } else if (isSelected) {
              tone = "border-indigo-400 bg-indigo-50 text-indigo-950";
            }
            return (
              <li key={`${option}-${optionIndex}`}>
                <button
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${tone}`}
                  disabled={answered || Boolean(flipped)}
                  onClick={() => onSelectOption?.(option)}
                  type="button"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="play-choice-text">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
