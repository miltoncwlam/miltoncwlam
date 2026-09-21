"use client";

import { useTranslations } from "next-intl";

export function PrintPackButton() {
  const t = useTranslations("printPack");
  return (
    <button
      className="primary-button no-print"
      onClick={() => window.print()}
      type="button"
    >
      {t("print")}
    </button>
  );
}
