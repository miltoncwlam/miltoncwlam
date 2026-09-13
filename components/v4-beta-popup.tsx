"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { enterBeta, hideBetaPrompt } from "@/components/beta-session";
import { BETA_SESSION_KEY } from "@/lib/beta";

export function V4BetaPopup() {
  const t = useTranslations("landing");
  const [pending, setPending] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    try {
      if (sessionStorage.getItem(BETA_SESSION_KEY) === "1") return;
    } catch {
      // ignore
    }
    dialog.showModal();
  }, []);

  async function dismiss() {
    setPending(true);
    await hideBetaPrompt(quiet);
    dialogRef.current?.close();
    if (quiet) window.location.assign("/");
    setPending(false);
  }

  async function enter() {
    setPending(true);
    await enterBeta(quiet);
    dialogRef.current?.close();
    if (quiet) window.location.assign("/");
    else setPending(false);
  }

  return (
    <dialog
      aria-labelledby="v4-beta-title"
      className="v4-beta-popup-card"
      onCancel={(event) => {
        event.preventDefault();
        void dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) void dismiss();
      }}
      ref={dialogRef}
    >
      <p className="landing-kicker">{t("betaKicker")}</p>
      <h2 className="page-title mt-2" id="v4-beta-title">
        {t("betaTitle")}
      </h2>
      <p className="page-subtitle mt-3">{t("betaBody")}</p>
      <label className="beta-quiet">
        <input
          checked={quiet}
          onChange={(event) => setQuiet(event.target.checked)}
          type="checkbox"
        />
        {t("betaQuiet")}
      </label>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button className="text-button" disabled={pending} onClick={() => void dismiss()} type="button">
          {t("betaStay")}
        </button>
        <button
          className="primary-button"
          disabled={pending}
          onClick={() => void enter()}
          type="button"
        >
          {pending ? t("betaEntering") : t("betaEnter")}
        </button>
      </div>
    </dialog>
  );
}
