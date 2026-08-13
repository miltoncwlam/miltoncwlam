import { notFound } from "next/navigation";

import { PlayDispatcher } from "@/components/play/play-dispatcher";
import { QuizPlayer } from "@/components/quiz-player";
import { StudyPlayer } from "@/components/study-player";
import { getSharedDeck } from "@/lib/data/shares";
import { activityFromQuery } from "@/lib/play/activity";
import { templateReason } from "@/lib/play/eligibility";
import { shuffleIds } from "@/lib/study/shuffle";
import type { QuizSession } from "@/lib/types/flashcard";

export default async function EmbedDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string; activity?: string; t?: string }>;
}) {
  const { token } = await params;
  const { mode, activity: activityParam, t } = await searchParams;
  const deck = await getSharedDeck(token);
  if (!deck || deck.generationStatus !== "complete") notFound();

  const activity = activityFromQuery(activityParam) ?? activityFromQuery(mode);
  const quizMode = mode === "quiz" && !activity;
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
  const home = `/embed/${token}`;

  return (
    <main className="mx-auto max-w-3xl px-3 py-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        HK Study A embed
      </p>
      <h1 className="mt-1 text-xl font-black text-slate-950">{deck.title}</h1>
      {activity ? (
        <div className="mt-4">
          {templateReason(activity, deck.cards) ? (
            <p className="empty-state">{templateReason(activity, deck.cards)}</p>
          ) : (
            <PlayDispatcher
              cards={deck.cards}
              deckId={deck.id}
              homeHref={`${home}${mode === "quiz" ? "?mode=quiz" : ""}`}
              key={t ?? activity}
              readOnly
              replayHref={`${home}?mode=${activity}`}
              template={activity}
            />
          )}
        </div>
      ) : quizMode ? (
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
