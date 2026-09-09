import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";

import { GiftCodeForm } from "@/components/gift-code-form";
import { requireSession } from "@/lib/auth-server";
import { getOrRefreshCredits } from "@/lib/data/credits";
import { LEGAL } from "@/lib/legal";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const t = await getTranslations("account");
  const tg = await getTranslations("gift");
  const guest = Boolean(session.user.isGuest);
  let unlimited = false;
  try {
    unlimited = guest
      ? false
      : (await getOrRefreshCredits(session.user.id)).isUnlimited;
  } catch {
    unlimited = false;
  }

  return (
    <main className="page-shell max-w-3xl">
      <Link className="text-button" href="/decks">
        ← {t("back")}
      </Link>
      <p className="eyebrow mt-6">{t("eyebrow")}</p>
      <h1 className="page-title">{t("title")}</h1>
      {guest ? (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="font-bold text-slate-900">{t("guestTitle")}</p>
          <p className="mt-2 text-sm text-slate-700">{t("guestBody")}</p>
          {params.upgrade ? (
            <p className="mt-2 text-sm font-semibold text-indigo-800">
              {t("guestUpgradeHint")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="page-subtitle">
          {t("signedIn", { email: session.user.email })}
        </p>
      )}
      <p className="mt-3">
        <Link className="text-button" href="/decks?tour=1">
          {t("replayTutorial")}
        </Link>
      </p>
      {guest ? null : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-bold text-slate-900">{tg("title")}</p>
          {unlimited ? (
            <p className="mt-2 text-sm text-emerald-800">{tg("already")}</p>
          ) : (
            <div className="mt-3">
              <GiftCodeForm />
            </div>
          )}
        </div>
      )}
      {guest ? null : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-bold text-slate-900">{t("deleteTitle")}</p>
          <p className="mt-1 text-sm text-slate-600">
            {t("deleteBody", { email: LEGAL.contactEmail })}
          </p>
          <p className="mt-2 text-sm">
            <a
              className="font-semibold text-indigo-700 underline"
              href={`mailto:${LEGAL.contactEmail}`}
            >
              {LEGAL.contactEmail}
            </a>
          </p>
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <UserProfile routing="hash" />
      </div>
    </main>
  );
}
