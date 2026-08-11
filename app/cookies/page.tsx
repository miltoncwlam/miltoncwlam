import { getTranslations } from "next-intl/server";

import { LegalPageShell } from "@/components/legal-page";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { LEGAL } from "@/lib/legal";

export default async function CookiesPage() {
  const t = await getTranslations("cookies");
  const values = {
    product: LEGAL.productName,
    email: LEGAL.contactEmail,
    localeCookie: LOCALE_COOKIE,
  };

  return (
    <LegalPageShell titleKey="cookiesTitle">
      <p>{t("intro", values)}</p>
      {(["s1", "s2", "s3", "s4"] as const).map((key) => (
        <section key={key}>
          <h2 className="text-xl font-black text-slate-950">{t(key)}</h2>
          <p className="mt-2">{t(`${key}b`, values)}</p>
        </section>
      ))}
    </LegalPageShell>
  );
}
