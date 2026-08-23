import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuizPlayer } from "@/components/quiz-player";
import { StudyPlayer } from "@/components/study-player";
import { startSharedStudyAction } from "@/lib/actions/study";
import { getSession } from "@/lib/auth-server";
import { getSharedDeck } from "@/lib/data/shares";
import { getLatestStudySession } from "@/lib/data/study";
import { shuffleIds } from "@/lib/study/shuffle";
import type { QuizSession } from "@/lib/types/flashcard";

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
  searchParams: Promise<{ mode?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const [deck, session] = await Promise.all([getSharedDeck(token), getSession()]);
  if (!deck) notFound();

  const quizMode = query.mode === "quiz";
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

      {quizMode ? (
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
        </>
      )}

      {!session ? (
        <p className="mt-8 text-center text-sm text-slate-600">
          <Link className="font-bold text-indigo-700 underline" href="/sign-in">
            Sign in
          </Link>{" "}
          to save your progress.
        </p>
      ) : !studySession && !quizMode ? (
        <form action={startSharedStudyAction} className="mt-8 text-center">
          <input name="deckId" type="hidden" value={deck.id} />
          <input name="token" type="hidden" value={token} />
          <button className="primary-button" type="submit">Save my progress</button>
        </form>
      ) : null}
    </main>
  );
}
