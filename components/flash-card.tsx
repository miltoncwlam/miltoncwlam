"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";

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

  return async function speak(text: string) {
    if (typeof window === "undefined" || !text.trim()) return;
    audioRef.current?.pause();
    audioRef.current = null;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });
      if (!response.ok) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      // Ignore playback errors (autoplay blocks, network, etc.)
    }
  };
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
  const speak = useCardSpeech();
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
              {hint ? (
                <span className="card-hint tcg-weakness">{hint}</span>
              ) : null}
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

      <div className="study-card-controls flex flex-wrap items-center justify-center gap-3">
        <Button
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
            let tone = "study-choice";
            if (answered && isCorrectOption) {
              tone = "study-choice is-correct";
            } else if (answered && isSelected && !isCorrectOption) {
              tone = "study-choice is-wrong";
            } else if (isSelected) {
              tone = "study-choice is-selected";
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
