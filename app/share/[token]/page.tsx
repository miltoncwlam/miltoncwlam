import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StudyPlayer } from "@/components/study-player";
import { startSharedStudyAction } from "@/lib/actions/study";
import { getSession } from "@/lib/auth-server";
import { getSharedDeck } from "@/lib/data/shares";
import { getLatestStudySession } from "@/lib/data/study";

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
}: PageProps<"/share/[token]">) {
  const { token } = await params;
  const [deck, session] = await Promise.all([getSharedDeck(token), getSession()]);
  if (!deck) notFound();

  const studySession = session
    ? await getLatestStudySession(deck.id, session.user.id)
    : null;

  return (
    <main className="page-shell max-w-3xl">
      <div className="mb-8 text-center">
        <p className="eyebrow">Shared read-only deck</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">{deck.cards.length} cards</p>
      </div>

      <StudyPlayer
        cards={deck.cards}
        deckId={deck.id}
        initialSession={studySession ?? undefined}
        readOnly={!studySession}
      />

      {!session ? (
        <p className="mt-8 text-center text-sm text-slate-600">
          <Link className="font-bold text-indigo-700 underline" href="/sign-in">
            Sign in
          </Link>{" "}
          to save your progress.
        </p>
      ) : !studySession ? (
        <form action={startSharedStudyAction} className="mt-8 text-center">
          <input name="deckId" type="hidden" value={deck.id} />
          <input name="token" type="hidden" value={token} />
          <button className="primary-button" type="submit">Save my progress</button>
        </form>
      ) : null}
    </main>
  );
}
