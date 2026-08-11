"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function LandingAuthCta() {
  const t = useTranslations("landing");

  return (
    <div className="mt-9 max-w-sm space-y-4">
      <div className="flex flex-wrap gap-3">
        <Link className="primary-button" href="/sign-in">
          {t("continue")}
        </Link>
        <Link className="secondary-button" href="/sign-up">
          {t("createAccount")}
        </Link>
      </div>
      <p className="text-sm font-semibold text-[var(--muted)]">{t("authNote")}</p>
      <p className="text-xs font-semibold leading-5 text-[var(--muted)]">
        {t.rich("agree", {
          terms: (chunks) => (
            <Link className="link-accent underline" href="/terms">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link className="link-accent underline" href="/privacy">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
