import { notFound } from "next/navigation";

import { QuizPlayer } from "@/components/quiz-player";
import { StudyPlayer } from "@/components/study-player";
import { getSharedDeck } from "@/lib/data/shares";
import { shuffleIds } from "@/lib/study/shuffle";
import type { QuizSession } from "@/lib/types/flashcard";

export default async function EmbedDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { token } = await params;
  const { mode } = await searchParams;
  const deck = await getSharedDeck(token);
  if (!deck || deck.generationStatus !== "complete") notFound();

  const quizMode = mode === "quiz";
  const questionOrder = shuffleIds(deck.cards.map((card) => card.id));
  const quizSession: QuizSession = {
    id: "embed",
    deckId: deck.id,
    userId: "embed",
    questionOrder,
    currentIndex: 0,
    score: 0,
    total: questionOrder.length,
    startedAt: new Date(),
    completedAt: null,
  };

  return (
    <main className="mx-auto max-w-3xl px-3 py-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        HK Study A embed
      </p>
      <h1 className="mt-1 text-xl font-black text-slate-950">{deck.title}</h1>
      {quizMode ? (
        <div className="mt-4">
          <QuizPlayer
            cards={deck.cards}
            deckId={deck.id}
            initialSession={quizSession}
            readOnly
          />
        </div>
      ) : (
        <div className="mt-4">
          <StudyPlayer cards={deck.cards} deckId={deck.id} readOnly />
        </div>
      )}
    </main>
  );
}
