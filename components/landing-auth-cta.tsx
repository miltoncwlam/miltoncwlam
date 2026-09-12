"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { GuestSignInButton } from "@/components/guest-sign-in-button";

export function LocalDevEnterButton({
  className,
  label = "Continue on localhost",
  redirectTo = "/decks/new",
}: {
  className?: string;
  label?: string;
  redirectTo?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/guest", { method: "POST" });
      const payload = (await response.json()) as {
        local?: boolean;
        redirect?: string;
        error?: string;
      };
      if (!response.ok || !payload.local) {
        throw new Error(payload.error || "Could not start a local session");
      }
      window.location.assign(payload.redirect || redirectTo);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start a local session",
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className={className}
        disabled={pending}
        onClick={() => void enter()}
        type="button"
      >
        {pending ? "Opening…" : label}
      </button>
      {error ? (
        <p className="text-center text-sm text-rose-800 xl:text-left">{error}</p>
      ) : null}
    </div>
  );
}

export function LandingAuthCta({ localDev = false }: { localDev?: boolean }) {
  const t = useTranslations("landing");

  return (
    <div className="landing-cta mt-10 space-y-4">
      {localDev ? (
        <LocalDevEnterButton
          className="primary-button w-full sm:w-auto"
          label="Continue on localhost"
        />
      ) : (
        <div className="flex flex-wrap justify-center gap-3 xl:justify-start">
          <Link className="primary-button" href="/sign-in">
            {t("continue")}
          </Link>
          <Link className="secondary-button" href="/sign-up">
            {t("createAccount")}
          </Link>
        </div>
      )}
      {localDev ? null : (
        <GuestSignInButton
          className="secondary-button w-full sm:w-auto"
          label={t("tryGuest")}
        />
      )}
      <p className="text-center text-base text-[var(--muted)] xl:text-left">
        {localDev
          ? "Clerk is off on localhost. This signs you in as a local learner so you can test."
          : t("authNote")}
      </p>
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
