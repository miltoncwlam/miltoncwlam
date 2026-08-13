"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Select disabled={pending} onValueChange={onChange} value={locale}>
        <SelectTrigger aria-label={t("language")} className="h-8 w-[9.5rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCALE_CODES.map((code) => (
            <SelectItem key={code} value={code}>
              {LOCALE_LABELS[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
