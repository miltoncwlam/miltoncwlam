"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { enterV4BetaAction } from "@/lib/actions/beta";

const DISMISSED_KEY = "hkstudya-beta-dismissed";

export function V4BetaPopup() {
  const t = useTranslations("landing");
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    try {
      if (sessionStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // ignore
    }
    dialog.showModal();
  }, []);

  function rememberDismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  function dismiss() {
    rememberDismiss();
    dialogRef.current?.close();
  }

  return (
    <dialog
      aria-labelledby="v4-beta-title"
      className="v4-beta-popup-card"
      onCancel={rememberDismiss}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      ref={dialogRef}
    >
      <p className="landing-kicker">{t("betaKicker")}</p>
      <h2 className="page-title mt-2" id="v4-beta-title">
        {t("betaTitle")}
      </h2>
      <p className="page-subtitle mt-3">{t("betaBody")}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button className="text-button" onClick={dismiss} type="button">
          {t("betaStay")}
        </button>
        <button
          className="primary-button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void enterV4BetaAction();
          }}
          type="button"
        >
          {pending ? t("betaEntering") : t("betaEnter")}
        </button>
      </div>
    </dialog>
  );
}
