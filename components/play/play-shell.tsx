"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { completeGameRunAction } from "@/lib/actions/games";
import type { PlayTemplateId } from "@/lib/play/templates";

export type PlayOptions = {
  readOnly?: boolean;
  homeHref?: string;
  replayHref?: string;
};

const PlayOptionsContext = createContext<PlayOptions>({});

export function PlayOptionsProvider({
  value,
  children,
}: {
  value: PlayOptions;
  children: React.ReactNode;
}) {
  return (
    <PlayOptionsContext.Provider value={value}>
      {children}
    </PlayOptionsContext.Provider>
  );
}

export function PlayShell({
  title,
  score,
  maxScore,
  extra,
  children,
}: {
  title: string;
  score: number;
  maxScore: number;
  extra?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="study-mobile mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-[var(--muted)]">
        <span>{title}</span>
        <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-[var(--ink)]">
          {score}/{maxScore}
          {extra ? ` · ${extra}` : ""}
        </span>
      </div>
      {children}
    </section>
  );
}

export function PlayFinished({
  deckId,
  template,
  score,
  maxScore,
  message,
}: {
  deckId: string;
  template: PlayTemplateId;
  score: number;
  maxScore: number;
  message?: string;
}) {
  const router = useRouter();
  const options = useContext(PlayOptionsContext);
  const saved = useRef(false);
  useEffect(() => {
    if (options.readOnly || saved.current) return;
    saved.current = true;
    void completeGameRunAction({ deckId, template, score, maxScore }).catch(
      () => undefined,
    );
  }, [deckId, template, score, maxScore, options.readOnly]);

  const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const home = options.homeHref ?? `/decks/${deckId}/play`;
  const replay =
    options.replayHref ?? `/decks/${deckId}/play/${template}?t=${Date.now()}`;
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <p className="eyebrow">Activity clear</p>
      <h2 className="page-title mt-3">
        {score}/{maxScore}
      </h2>
      <p className="page-subtitle">
        {pct}% · {message ?? "Nice work — this still counts as practice."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          className="secondary-button"
          onClick={() => router.push(home)}
          type="button"
        >
          More activities
        </button>
        <button
          className="primary-button"
          onClick={() =>
            router.push(
              options.replayHref
                ? `${replay}${replay.includes("?") ? "&" : "?"}t=${Date.now()}`
                : replay,
            )
          }
          type="button"
        >
          Play again
        </button>
      </div>
    </section>
  );
}

export function WhyBox({
  ok,
  why,
  onContinue,
}: {
  ok: boolean;
  why?: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-3 text-center">
      <p
        className={`text-sm font-black ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
      >
        {ok ? "Correct" : "Not quite"}
      </p>
      {why ? (
        <p className="text-sm leading-relaxed text-[var(--muted)]">{why}</p>
      ) : null}
      <button className="primary-button" onClick={onContinue} type="button">
        Continue
      </button>
    </div>
  );
}
