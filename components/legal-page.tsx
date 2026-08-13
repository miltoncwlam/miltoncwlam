import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { LEGAL, type LegalBlock } from "@/lib/legal";

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <section key={block.heading}>
          <h2 className="text-xl font-black text-slate-950">{block.heading}</h2>
          {block.paragraphs.map((paragraph) => (
            <p className="mt-2" key={paragraph.slice(0, 48)}>
              {paragraph}
            </p>
          ))}
          {block.bullets?.length ? (
            <ul className="mt-2 list-disc space-y-2 pl-5">
              {block.bullets.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </>
  );
}

export async function LegalPageShell({
  titleKey,
  children,
}: {
  titleKey: "privacyTitle" | "termsTitle" | "cookiesTitle";
  children: ReactNode;
}) {
  const t = await getTranslations("legal");

  return (
    <main className="page-shell max-w-3xl">
      <h1 className="page-title text-4xl">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {t("lastUpdated", { date: LEGAL.lastUpdated })}
      </p>
      <p className="mt-2 text-sm text-amber-800">{t("notLegalAdvice")}</p>
      <p className="mt-2 text-sm text-slate-600">{t("governingLanguage")}</p>
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
