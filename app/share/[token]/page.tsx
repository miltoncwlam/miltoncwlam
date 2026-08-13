import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayDispatcher } from "@/components/play/play-dispatcher";
import { QuizPlayer } from "@/components/quiz-player";
import { StudyPlayer } from "@/components/study-player";
import { startSharedStudyAction } from "@/lib/actions/study";
import { getSession } from "@/lib/auth-server";
import { getSharedDeck } from "@/lib/data/shares";
import { getLatestStudySession } from "@/lib/data/study";
import { activityFromQuery } from "@/lib/play/activity";
import { templateReason } from "@/lib/play/eligibility";
import { PLAY_TEMPLATES } from "@/lib/play/templates";
import { PLAY_SKIN_EMOJI, PLAY_SKINS } from "@/lib/play/worlds";
import { shuffleIds } from "@/lib/study/shuffle";
import type { QuizSession } from "@/lib/types/flashcard";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps<"/share/[token]">): Promise<Metadata> {
  const { token } = await params;
  const deck = await getSharedDeck(token);
  return {
    title: deck ? `${deck.title} · HK Study A` : "Shared deck · HK Study A",
    description: "Study a read-only AI-generated flashcard deck.",
  };
}

export default async function SharedDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ activity?: string; t?: string; mode?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const t = await getTranslations("play");
  const [deck, session] = await Promise.all([getSharedDeck(token), getSession()]);
  if (!deck) notFound();

  const activity = activityFromQuery(query.activity) ?? activityFromQuery(query.mode);
  const quizMode = query.mode === "quiz" && !activity;
  const studySession = session
    ? await getLatestStudySession(deck.id, session.user.id)
    : null;
  const home = `/share/${token}`;
  const questionOrder = shuffleIds(deck.cards.map((card) => card.id));
  const quizSession: QuizSession = {
    id: "share",
    deckId: deck.id,
    userId: session?.user.id ?? "share",
    questionOrder,
    currentIndex: 0,
    score: 0,
    total: questionOrder.length,
    startedAt: new Date(),
    completedAt: null,
  };

  return (
    <main className="page-shell max-w-3xl">
      <div className="mb-8 text-center">
        <p className="eyebrow">Shared read-only deck</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">{deck.cards.length} cards</p>
      </div>

      {activity ? (
        <>
          <p className="mb-4 text-center text-sm">
            <Link className="text-button" href={home}>
              ← All activities
            </Link>
          </p>
          {templateReason(activity, deck.cards) ? (
            <p className="empty-state">{templateReason(activity, deck.cards)}</p>
          ) : (
            <PlayDispatcher
              cards={deck.cards}
              deckId={deck.id}
              homeHref={home}
              key={query.t ?? activity}
              readOnly
              replayHref={`${home}?activity=${activity}`}
              template={activity}
            />
          )}
        </>
      ) : quizMode ? (
        <>
          <p className="mb-4 text-center text-sm">
            <Link className="text-button" href={home}>
              ← Study cards
            </Link>
          </p>
          <QuizPlayer
            cards={deck.cards}
            deckId={deck.id}
            initialSession={quizSession}
            readOnly
          />
        </>
      ) : (
        <>
          <StudyPlayer
            cards={deck.cards}
            deckId={deck.id}
            initialSession={studySession ?? undefined}
            readOnly={!studySession}
          />
          <section className="mt-10">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
              {t("eyebrow")}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {PLAY_TEMPLATES.map((item) => (
                <Link
                  className={`play-pick play-stage--${PLAY_SKINS[item.id]}`}
                  href={`${home}?activity=${item.id}`}
                  key={item.id}
                >
                  <p className="font-bold">{t(`templates.${item.id}.name`)}</p>
                  <p className="mt-1 text-sm">{t(`templates.${item.id}.blurb`)}</p>
                  <span className="play-pick-emoji" aria-hidden>
                    {PLAY_SKIN_EMOJI[PLAY_SKINS[item.id]]}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {!session ? (
        <p className="mt-8 text-center text-sm text-slate-600">
          <Link className="font-bold text-indigo-700 underline" href="/sign-in">
            Sign in
          </Link>{" "}
          to save your progress.
        </p>
      ) : !studySession && !activity ? (
        <form action={startSharedStudyAction} className="mt-8 text-center">
          <input name="deckId" type="hidden" value={deck.id} />
          <input name="token" type="hidden" value={token} />
          <button className="primary-button" type="submit">Save my progress</button>
        </form>
      ) : null}
    </main>
  );
}
