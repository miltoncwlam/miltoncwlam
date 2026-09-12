"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { enterV4BetaAction } from "@/lib/actions/beta";

export function V4BetaPopup() {
  const t = useTranslations("landing");
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby="v4-beta-title"
      className="v4-beta-popup-card"
      onCancel={(event) => event.preventDefault()}
      ref={dialogRef}
    >
      <p className="landing-kicker">{t("betaKicker")}</p>
      <h2 className="page-title mt-2" id="v4-beta-title">
        {t("betaTitle")}
      </h2>
      <p className="page-subtitle mt-3">{t("betaBody")}</p>
      <div className="mt-6 flex justify-end">
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
