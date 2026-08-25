import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EnergyBadge } from "@/components/energy-badge";
import { StreakBadge } from "@/components/streak-badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import type { AppSession } from "@/lib/auth-server";
import { isAdminUser } from "@/lib/auth-server";

export async function AppHeader({ session }: { session: AppSession | null }) {
  const t = await getTranslations("nav");
  const signedIn = Boolean(session);
  const isAdmin = session ? isAdminUser(session.user) : false;

  return (
    <header className="app-header">
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <Link className="app-brand" href="/">
          <span className="brand-mark">S</span>
          HK Study A
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-2 font-sans text-[13px] font-medium"
          aria-label={t("primary")}
        >
          <LocaleSwitcher />
          {signedIn && session ? (
            <>
              <StreakBadge userId={session.user.id} />
              <EnergyBadge userId={session.user.id} />
              <Button asChild variant="ghost">
                <Link href="/decks">{t("myDecks")}</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/account">Account</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/community">{t("community")}</Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="ghost">
                  <Link href="/admin">Admin</Link>
                </Button>
              ) : null}
              <Button asChild>
                <Link href="/decks/new">{t("createDeck")}</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/sign-in">{t("signIn")}</Link>
              </Button>
              <Button asChild className="rounded-full bg-[var(--accent)] px-4 text-[var(--primary-foreground)] hover:opacity-90">
                <Link href="/sign-up">{t("signUp")}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
