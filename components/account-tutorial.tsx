"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const STEP_IDS = ["welcome", "create", "study", "play", "quiz"] as const;

export function tutorialStorageKey(userId: string) {
  return `study-a-tutorial:${userId}`;
}

function subscribeTutorial() {
  return () => undefined;
}

export function AccountTutorial({ userId }: { userId: string }) {
  const t = useTranslations("tutorial");
  const router = useRouter();
  const searchParams = useSearchParams();
  const replay = searchParams.get("tour") === "1";
  const seen = useSyncExternalStore(
    subscribeTutorial,
    () => {
      try {
        return localStorage.getItem(tutorialStorageKey(userId)) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [closed, setClosed] = useState(false);
  const [step, setStep] = useState(0);

  const open = !closed && (replay || !seen);

  function closeTour() {
    try {
      localStorage.setItem(tutorialStorageKey(userId), "1");
    } catch {
      // ignore
    }
    setClosed(true);
    if (!replay) return;
    const next = new URL(window.location.href);
    next.searchParams.delete("tour");
    const href = `${next.pathname}${next.search}${next.hash}` || "/decks";
    window.history.replaceState(null, "", href);
    router.replace(href);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      try {
        localStorage.setItem(tutorialStorageKey(userId), "1");
      } catch {
        // ignore
      }
      setClosed(true);
      if (replay) {
        const next = new URL(window.location.href);
        next.searchParams.delete("tour");
        const href = `${next.pathname}${next.search}${next.hash}` || "/decks";
        window.history.replaceState(null, "", href);
        router.replace(href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, replay, router, userId]);

  if (!open) return null;

  const id = STEP_IDS[step] ?? STEP_IDS[0];
  const last = step >= STEP_IDS.length - 1;

  return (
    <div className="account-tutorial" role="presentation">
      <div
        aria-labelledby="account-tutorial-title"
        aria-modal="true"
        className="account-tutorial-card"
        role="dialog"
      >
        <p className="eyebrow">{t("stepOf", { current: step + 1, total: STEP_IDS.length })}</p>
        <h2 className="page-title mt-2" id="account-tutorial-title">
          {t(`steps.${id}.title`)}
        </h2>
        <p className="page-subtitle mt-3">{t(`steps.${id}.body`)}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className="text-button" onClick={closeTour} type="button">
            {t("skip")}
          </button>
          {step > 0 ? (
            <button
              className="secondary-button"
              onClick={() => setStep((n) => n - 1)}
              type="button"
            >
              {t("back")}
            </button>
          ) : null}
          {last ? (
            <button className="primary-button" onClick={closeTour} type="button">
              {t("done")}
            </button>
          ) : (
            <button
              className="primary-button"
              onClick={() => setStep((n) => n + 1)}
              type="button"
            >
              {t("next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
