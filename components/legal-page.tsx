import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { LEGAL, type LegalBlock } from "@/lib/legal";

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <section key={block.heading}>
          <h2 className="font-display text-[length:clamp(1.35rem,2.4vw,1.6rem)] font-semibold leading-tight tracking-tight text-[var(--ink)]">
            {block.heading}
          </h2>
          {block.paragraphs.map((paragraph) => (
            <p className="mt-3" key={paragraph.slice(0, 48)}>
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
      <p className="eyebrow">HK Study A</p>
      <h1 className="page-title">{t(titleKey)}</h1>
      <p className="mt-3 text-base text-[var(--muted)]">
        {t("lastUpdated", { date: LEGAL.lastUpdated })}
      </p>
      <p className="mt-3 text-base text-[var(--muted)]">{t("notLegalAdvice")}</p>
      <p className="mt-2 text-base text-[var(--muted)]">{t("governingLanguage")}</p>
      <article className="legal-prose mt-10 max-w-prose space-y-8 text-[length:clamp(1.12rem,1.4vw,1.22rem)] leading-8 text-[var(--ink)]">
        {children}
      </article>
      <p className="mt-12 text-base text-[var(--muted)]">
        {t("contact")}:{" "}
        <a className="font-semibold text-[var(--accent-strong)] underline" href={`mailto:${LEGAL.contactEmail}`}>
          {LEGAL.contactEmail}
        </a>
      </p>
    </main>
  );
}
