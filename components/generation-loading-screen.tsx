"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export type GenerationPhase =
  | "prepare"
  | "upload"
  | "read"
  | "generate"
  | "save"
  | "done";

const PHASE_IDS: GenerationPhase[] = [
  "prepare",
  "upload",
  "read",
  "generate",
  "save",
];

export function GenerationLoadingScreen({
  phase,
  label,
  includeUpload,
  error,
  onRetry,
  onDismiss,
}: {
  phase: GenerationPhase;
  label: string;
  includeUpload: boolean;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const t = useTranslations("generation");
  const [tipIndex, setTipIndex] = useState(0);
  const tips = t.raw("tips") as string[];
  const visiblePhases = includeUpload
    ? PHASE_IDS
    : PHASE_IDS.filter((entry) => entry !== "upload");
  const activeIndex = visiblePhases.findIndex((entry) => entry === phase);
  const stepNumber =
    phase === "done"
      ? visiblePhases.length
      : Math.max(1, (activeIndex >= 0 ? activeIndex : 0) + 1);
  const waitingOnModel = phase === "generate" && !error;

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((value) => (value + 1) % Math.max(tips.length, 1));
    }, 4500);
    return () => window.clearInterval(id);
  }, [tips.length]);

  const phaseTitle = (id: GenerationPhase) => {
    switch (id) {
      case "prepare":
        return t("prepare");
      case "upload":
        return t("upload");
      case "read":
        return t("read");
      case "generate":
        return t("generate");
      case "save":
        return t("save");
      default:
        return id;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
          {t("eyebrow")}
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          {error ? t("errorTitle") : phase === "done" ? t("doneTitle") : label}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {error
            ? error
            : phase === "done"
              ? t("opening")
              : waitingOnModel
                ? t("waitingCloud")
                : t("moving")}
        </p>

        {error ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {onRetry ? (
              <button className="primary-button flex-1" onClick={onRetry} type="button">
                {t("retry")}
              </button>
            ) : null}
            {onDismiss ? (
              <button
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
                onClick={onDismiss}
                type="button"
              >
                {t("dismiss")}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <ol className="mt-6 space-y-2">
              {visiblePhases.map((entry, index) => {
                const state =
                  phase === "done" || (activeIndex >= 0 && index < activeIndex)
                    ? "done"
                    : entry === phase
                      ? "active"
                      : "todo";
                return (
                  <li
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      state === "active"
                        ? "bg-indigo-50 font-bold text-indigo-900"
                        : state === "done"
                          ? "text-emerald-700"
                          : "text-slate-400"
                    }`}
                    key={entry}
                  >
                    <span className="w-5 text-center">
                      {state === "done" ? "✓" : state === "active" ? "●" : "○"}
                    </span>
                    <span>{phaseTitle(entry)}</span>
                  </li>
                );
              })}
            </ol>

            {waitingOnModel ? (
              <div className="mt-6 grid grid-cols-3 gap-2" aria-hidden>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    className="generation-card-slot h-16 rounded-xl border border-indigo-100 bg-indigo-50/70"
                    key={index}
                    style={{ animationDelay: `${index * 120}ms` }}
                  />
                ))}
              </div>
            ) : null}

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-800">
                <span>
                  {phase === "done"
                    ? t("complete")
                    : waitingOnModel
                      ? t("modelRunning")
                      : t("stepOf", {
                          current: stepNumber,
                          total: visiblePhases.length,
                        })}
                </span>
                <span>
                  {phase === "done"
                    ? "100%"
                    : waitingOnModel
                      ? "…"
                      : `${stepNumber}/${visiblePhases.length}`}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                {phase === "done" ? (
                  <div className="h-full w-full rounded-full bg-indigo-600" />
                ) : waitingOnModel ? (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <div className="generation-shimmer h-full w-1/3 bg-indigo-500/70" />
                  </div>
                ) : (
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-[width] duration-500"
                    style={{
                      width: `${Math.round((stepNumber / visiblePhases.length) * 100)}%`,
                    }}
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">{t("phaseAdvances")}</p>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                {t("tipTitle")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-800" key={tipIndex}>
                {tips[tipIndex] ?? ""}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
