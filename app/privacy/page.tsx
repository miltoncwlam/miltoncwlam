import { getTranslations } from "next-intl/server";

import { LegalPageShell } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const values = {
    product: LEGAL.productName,
    operator: LEGAL.operatorName,
    email: LEGAL.contactEmail,
    jurisdiction: LEGAL.jurisdiction,
  };

  return (
    <LegalPageShell titleKey="privacyTitle">
      <p>{t("intro", values)}</p>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s1")}</h2>
        <p className="mt-2">{t("s1b", values)}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s2")}</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>{t("s2a")}</li>
          <li>{t("s2b")}</li>
          <li>{t("s2c")}</li>
          <li>{t("s2d")}</li>
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s3")}</h2>
        <p className="mt-2">{t("s3b")}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s4")}</h2>
        <p className="mt-2">{t("s4b")}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s5")}</h2>
        <p className="mt-2">{t("s5b")}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s6")}</h2>
        <p className="mt-2">{t("s6b")}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s7")}</h2>
        <p className="mt-2">{t("s7b")}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s8")}</h2>
        <p className="mt-2">{t("s8b", values)}</p>
      </section>
      <section>
        <h2 className="text-xl font-black text-slate-950">{t("s9")}</h2>
        <p className="mt-2">{t("s9b", values)}</p>
      </section>
    </LegalPageShell>
  );
}
