import { getTranslations } from "next-intl/server";

import { LegalPageShell } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export default async function TermsPage() {
  const t = await getTranslations("terms");
  const values = {
    product: LEGAL.productName,
    operator: LEGAL.operatorName,
    email: LEGAL.contactEmail,
    jurisdiction: LEGAL.jurisdiction,
  };

  return (
    <LegalPageShell titleKey="termsTitle">
      <p>{t("intro", values)}</p>
      {(["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"] as const).map((key) => (
        <section key={key}>
          <h2 className="text-xl font-black text-slate-950">{t(key)}</h2>
          <p className="mt-2">{t(`${key}b`, values)}</p>
        </section>
      ))}
    </LegalPageShell>
  );
}
