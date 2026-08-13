"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function LandingAuthCta() {
  const t = useTranslations("landing");

  return (
    <div className="landing-cta mt-10 space-y-4">
      <div className="flex flex-wrap justify-center gap-3 xl:justify-start">
        <Link className="primary-button" href="/sign-in">
          {t("continue")}
        </Link>
        <Link className="secondary-button" href="/sign-up">
          {t("createAccount")}
        </Link>
      </div>
      <p className="text-center text-base text-[var(--muted)] xl:text-left">{t("authNote")}</p>
      <p className="text-center text-sm leading-6 text-[var(--muted)] xl:text-left">
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
