import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LandingAuthCta } from "@/components/landing-auth-cta";
import { V4BetaPopup } from "@/components/v4-beta-popup";
import { isLocalAppHost } from "@/lib/auth-local";
import { getSession } from "@/lib/auth-server";
import { BETA_COOKIE, hasV4BetaAccess } from "@/lib/beta";

export default async function Home() {
  const session = await getSession();
  const beta = hasV4BetaAccess((await cookies()).get(BETA_COOKIE)?.value);
  if (session && beta) redirect("/decks");
  const t = await getTranslations("landing");
  const localDev = isLocalAppHost((await headers()).get("host"));

  return (
    <main className="landing-shell">
      <section className="landing-hero relative min-h-[calc(100vh-3.5rem)]">
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-kicker motion-fade-up">{t("eyebrow")}</p>
            <p className="landing-brand motion-fade-up">HK Study A</p>
            <h1 className="landing-title motion-fade-up motion-delay-1">
              {t.rich("title", {
                hl: (chunks) => <em>{chunks}</em>,
              })}
            </h1>
            <p className="landing-subtitle motion-fade-up motion-delay-2">
              {t("subtitle")}
            </p>
            <div className="motion-fade-up motion-delay-3">
              <LandingAuthCta localDev={localDev} />
            </div>
          </div>
          <div className="landing-hero-card" aria-hidden="true">
            {beta ? (
              <>
                <span className="card-rarity">HKDSE</span>
                <span className="font-label text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                  Biology · Paper 1
                </span>
                <strong className="landing-hero-card-q">
                  Explain how chlorophyll captures light.
                </strong>
                <span className="rounded-2xl bg-[var(--secondary)] p-4 font-medium text-[var(--muted)]">
                  30 min · sit this paper in the notebook
                </span>
              </>
            ) : (
              <>
                <span className="card-rarity">HK STUDY A</span>
                <span className="font-label text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                  Biology
                </span>
                <strong className="landing-hero-card-q">What powers the cell?</strong>
                <span className="rounded-2xl bg-[var(--secondary)] p-4 font-medium text-[var(--muted)]">
                  Flip to reveal the answer
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="landing-kicker">{t("featuresTitle")}</p>
        <h2 className="landing-section-title mt-4 text-center">
          {t("featuresTitle")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[length:clamp(1.05rem,1.5vw,1.2rem)] leading-7 text-[var(--muted)]">
          {t("featuresIntro")}
        </p>
        <div className="landing-features">
          <div>
            <p className="landing-feature-num">01</p>
            <h3 className="landing-feature-title">{t("feature1Title")}</h3>
            <p className="landing-feature-copy">{t("feature1Copy")}</p>
          </div>
          <div>
            <p className="landing-feature-num">02</p>
            <h3 className="landing-feature-title">{t("feature2Title")}</h3>
            <p className="landing-feature-copy">{t("feature2Copy")}</p>
          </div>
          <div>
            <p className="landing-feature-num">03</p>
            <h3 className="landing-feature-title">{t("feature3Title")}</h3>
            <p className="landing-feature-copy">{t("feature3Copy")}</p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link className="primary-button" href="/sign-up">
            Get started
          </Link>
          <Link className="secondary-button" href="/sign-in">
            Sign in
          </Link>
        </div>
      </section>
      {beta ? null : <V4BetaPopup />}
    </main>
  );
}
