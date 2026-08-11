import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EnergyBadge } from "@/components/energy-badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AppSession } from "@/lib/auth-server";
import { clerkAuthConfigured } from "@/lib/auth-server";

export async function AppHeader({ session }: { session: AppSession | null }) {
  const t = await getTranslations("nav");
  const signedIn = Boolean(session);
  const isAdmin =
    session?.provider === "better-auth" && session.user.role === "admin";
  const clerkEnabled = clerkAuthConfigured();

  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <Link className="app-brand" href="/">
          Study A
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-3"
          aria-label={t("primary")}
        >
          <ThemeToggle />
          <LocaleSwitcher />
          {signedIn && session ? (
            <>
              <EnergyBadge userId={session.user.id} />
              <Link className="nav-link" href="/decks">
                {t("myDecks")}
              </Link>
              <Link className="nav-link" href="/account">
                Account
              </Link>
              <Link className="nav-link" href="/community">
                {t("community")}
              </Link>
              {isAdmin ? (
                <Link className="nav-link" href="/admin">
                  Admin
                </Link>
              ) : null}
              <Link className="nav-cta" href="/decks/new">
                {t("createDeck")}
              </Link>
              <SignOutButton
                clerkEnabled={clerkEnabled}
                provider={session.provider}
              />
            </>
          ) : (
            <>
              <Link className="nav-link" href="/sign-in">
                {t("signIn")}
              </Link>
              <Link className="nav-cta" href="/sign-up">
                {t("signUp")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
