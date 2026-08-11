import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StudyPlayer } from "@/components/study-player";
import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import {
  countDueCards,
  getLatestStudySession,
  startStudySession,
} from "@/lib/data/study";

export default async function StudyPage({
  params,
  searchParams,
}: PageProps<"/decks/[deckId]/study">) {
  const session = await requireSession();
  const { deckId } = await params;
  const query = await searchParams;
  const startNew = query.new === "1";
  const shuffled = query.shuffle === "true";
  const dueOnly = query.due === "1";

  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();
  if (deck.generationStatus !== "complete" || deck.cards.length === 0) {
    redirect(`/decks/${deckId}`);
  }

  let studySession = startNew
    ? null
    : await getLatestStudySession(deckId, session.user.id);

  if (!studySession) {
    try {
      studySession = await startStudySession(
        deckId,
        session.user.id,
        shuffled,
        dueOnly ? "due" : "all",
      );
    } catch {
      redirect(`/decks/${deckId}`);
    }
  }

  const dueCount = await countDueCards(deckId, session.user.id);

  return (
    <main className="page-shell max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">
            Study session{dueOnly ? " · due today" : ""}
            {!dueOnly && dueCount > 0 ? ` · ${dueCount} due` : ""}
          </p>
          <h1 className="text-2xl font-black text-slate-950">{deck.title}</h1>
        </div>
        <Link className="secondary-button" href={`/decks/${deck.id}`}>
          Exit
        </Link>
      </div>
      <StudyPlayer
        cards={deck.cards}
        deckId={deck.id}
        initialSession={studySession}
      />
    </main>
  );
}
