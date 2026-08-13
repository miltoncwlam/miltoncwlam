import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";

import { requireSession } from "@/lib/auth-server";
import { LEGAL } from "@/lib/legal";

export default async function AccountPage() {
  const session = await requireSession();
  const t = await getTranslations("account");

  return (
    <main className="page-shell max-w-3xl">
      <Link className="text-button" href="/decks">
        ← {t("back")}
      </Link>
      <p className="eyebrow mt-6">{t("eyebrow")}</p>
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-subtitle">
        {t("signedIn", { email: session.user.email })}
      </p>
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
      <div className="mt-8 flex justify-center">
        <UserProfile routing="hash" />
      </div>
    </main>
  );
}
