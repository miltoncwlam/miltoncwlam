"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { LOCALE_CODES, LOCALE_LABELS, type AppLocale } from "@/lib/i18n/locales";

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onChange(next: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label className="locale-switcher flex items-center gap-2 text-sm">
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        className="locale-select rounded-lg border px-2 py-1.5 text-sm font-semibold"
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        value={locale}
      >
        {LOCALE_CODES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
