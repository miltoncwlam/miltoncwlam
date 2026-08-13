import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { QuizPlayer } from "@/components/quiz-player";
import { startQuizAction } from "@/lib/actions/quizzes";
import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { getQuizSession } from "@/lib/data/quizzes";

export default async function DeckQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const auth = await requireSession();
  const t = await getTranslations("quiz");
  const { deckId } = await params;
  const query = await searchParams;
  const deck = await getDeckWithCards(deckId, auth.user.id);
  if (!deck || deck.generationStatus !== "complete" || !deck.cards.length) {
    notFound();
  }

  if (!query.session) {
    await startQuizAction(deckId);
  }

  const session = await getQuizSession(query.session!, auth.user.id);
  if (!session || session.deckId !== deckId) {
    redirect(`/decks/${deckId}/quiz`);
  }

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deckId}`}>
        ← {t("backToDeck")}
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      <QuizPlayer
        cards={deck.cards}
        deckId={deck.id}
        initialSession={session}
      />
    </main>
  );
}
