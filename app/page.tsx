import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LandingAuthCta } from "@/components/landing-auth-cta";
import { getSession } from "@/lib/auth-server";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/decks");
  const t = await getTranslations("landing");

  return (
    <main className="landing-shell">
      <section className="landing-hero relative min-h-[calc(100vh-73px)]">
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-kicker motion-fade-up">
              <a href="https://sayo.ai" rel="noreferrer" target="_blank">
                A Sayo Academy product
              </a>
            </p>
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
              <LandingAuthCta />
            </div>
          </div>
          <div className="landing-hero-card" aria-hidden="true">
            <span className="card-rarity">HK STUDY A</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
              Biology
            </span>
            <strong className="landing-hero-card-q">What powers the cell?</strong>
            <span className="rounded-2xl bg-[var(--secondary)] p-4 font-medium text-[var(--muted)]">
              Flip to reveal the answer
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="landing-kicker">What you can do</p>
        <h2 className="landing-section-title mt-4 text-center">
          From notes to a deck worth collecting
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[length:clamp(1.05rem,1.5vw,1.2rem)] leading-7 text-[var(--muted)]">
          Paste text, import a URL, or upload a PDF. Study with spaced
          repetition, quiz battles, and shareable embeds.
        </p>
        <div className="landing-features">
          <div>
            <p className="landing-feature-num">01</p>
            <h3 className="landing-feature-title">Generate</h3>
            <p className="landing-feature-copy">
              Turn notes and PDFs into clear flashcards with AI.
            </p>
          </div>
          <div>
            <p className="landing-feature-num">02</p>
            <h3 className="landing-feature-title">Study</h3>
            <p className="landing-feature-copy">
              Flip, rate Hard / OK / Easy, and keep a spaced-repetition queue.
            </p>
          </div>
          <div>
            <p className="landing-feature-num">03</p>
            <h3 className="landing-feature-title">Quiz</h3>
            <p className="landing-feature-copy">
              Run a trainer-style quiz, then share or embed the deck.
            </p>
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
    </main>
  );
}
