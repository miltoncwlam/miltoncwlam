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
    <main className="landing-shell overflow-hidden">
      <section className="landing-hero relative min-h-[calc(100vh-73px)]">
        <div className="landing-hero-glow" aria-hidden />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:justify-center sm:pb-24">
          <p className="landing-brand motion-fade-up">HK Study A</p>
          <h1 className="landing-title motion-fade-up motion-delay-1">
            {t("title")}
          </h1>
          <p className="landing-subtitle motion-fade-up motion-delay-2">
            {t("subtitle")}
          </p>
          <div className="motion-fade-up motion-delay-3">
            <LandingAuthCta />
          </div>
        </div>
        <div className="landing-hero-card motion-float" aria-hidden="true">
          <span className="card-rarity">HK STUDY A · RARE</span>
          <span className="text-sm font-extrabold uppercase tracking-widest text-amber-800">
            Biology
          </span>
          <strong className="text-3xl text-[var(--ink)]" style={{ fontFamily: "var(--font-fredoka), sans-serif" }}>
            What powers the cell?
          </strong>
          <span className="rounded-2xl bg-white/75 p-4 font-bold text-[var(--muted)]">
            Flip to reveal the answer
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="landing-section-title">
          From notes to a deck worth collecting
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)] font-semibold leading-7">
          Paste text, import a URL, or upload a PDF. Study with spaced
          repetition, quiz battles, and shareable embeds.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="primary-button" href="/sign-up">
            Create a free account
          </Link>
          <Link className="secondary-button" href="/sign-in">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
