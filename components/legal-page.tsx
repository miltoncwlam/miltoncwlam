import { getTranslations } from "next-intl/server";

import { LEGAL } from "@/lib/legal";

export async function LegalPageShell({
  titleKey,
  children,
}: {
  titleKey: "privacyTitle" | "termsTitle" | "cookiesTitle";
  children: React.ReactNode;
}) {
  const t = await getTranslations("legal");

  return (
    <main className="page-shell max-w-3xl">
      <h1 className="page-title text-4xl">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {t("lastUpdated", { date: LEGAL.lastUpdated })}
      </p>
      <p className="mt-2 text-sm text-amber-800">{t("notLegalAdvice")}</p>
      <article className="legal-prose mt-8 space-y-6 text-slate-700 leading-7">
        {children}
      </article>
      <p className="mt-10 text-sm text-slate-600">
        {t("contact")}:{" "}
        <a className="font-semibold text-indigo-700 underline" href={`mailto:${LEGAL.contactEmail}`}>
          {LEGAL.contactEmail}
        </a>
      </p>
    </main>
  );
}
