"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { answerQuizAction } from "@/lib/actions/quizzes";
import { useSwipe } from "@/lib/hooks/use-swipe";
import { buildQuizChoices } from "@/lib/quiz/choices";
import type { Flashcard, QuizSession } from "@/lib/types/flashcard";

export function QuizPlayer({
  deckId,
  cards,
  initialSession,
  readOnly = false,
}: {
  deckId: string;
  cards: Flashcard[];
  initialSession: QuizSession;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isPending, startTransition] = useTransition();

  const byId = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const cardId = session.questionOrder[session.currentIndex];
  const card = cardId ? byId.get(cardId) : undefined;
  const choices = useMemo(
    () => (card ? buildQuizChoices(card, cards) : []),
    [card, cards],
  );

  const completed =
    Boolean(session.completedAt) || session.currentIndex >= session.total;

  const swipe = useSwipe({});

  if (completed) {
    const pct = session.total
      ? Math.round((session.score / session.total) * 100)
      : 0;
    return (
      <section className="mx-auto max-w-lg rounded-3xl border-4 border-amber-300 bg-gradient-to-b from-amber-50 to-orange-100 p-8 text-center shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
          Quiz clear
        </p>
        <h2 className="mt-3 text-3xl font-black text-slate-950">
          {session.score}/{session.total} correct
        </h2>
        <p className="mt-2 text-slate-700">
          {pct}% accuracy · +{session.score * 10} XP
        </p>
        {!readOnly ? (
          <div className="mt-8 flex justify-center gap-3">
            <button
              className="secondary-button"
              onClick={() => router.push(`/decks/${deckId}`)}
              type="button"
            >
              Back to deck
            </button>
            <button
              className="primary-button"
              onClick={() => router.push(`/decks/${deckId}/study`)}
              type="button"
            >
              Study cards
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  if (!card) {
    return <p className="empty-state">Quiz card missing.</p>;
  }

  return (
    <section className="study-mobile mx-auto max-w-xl space-y-5" {...swipe}>
      <div className="flex items-center justify-between text-sm font-bold text-slate-600">
        <span>
          Question {session.currentIndex + 1} / {session.total}
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
          Score {session.score}
        </span>
      </div>
      <p className="text-center text-xs text-slate-500 sm:hidden">
        Large tap targets · landscape-friendly quiz layout
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-amber-500 transition-all"
          style={{
            width: `${(session.currentIndex / Math.max(session.total, 1)) * 100}%`,
          }}
        />
      </div>

      <div className="tcg-quiz-shell">
        <p className="tcg-quiz-label">Trainer Challenge</p>
        <h2 className="mt-3 text-2xl font-black leading-snug text-slate-950">
          {card.front.replace(/\{\{blank\}\}/gi, "____")}
        </h2>
      </div>

      <div className="grid gap-3">
        {choices.map((choice) => (
          <button
            className="tcg-choice"
            disabled={isPending || Boolean(feedback)}
            key={choice}
            onClick={() =>
              startTransition(async () => {
                if (readOnly) {
                  const correct =
                    choice.trim().toLowerCase() === card.back.trim().toLowerCase();
                  const nextIndex = session.currentIndex + 1;
                  const nextScore = session.score + (correct ? 1 : 0);
                  setFeedback(correct ? "correct" : "wrong");
                  window.setTimeout(() => {
                    setSession({
                      ...session,
                      currentIndex: nextIndex,
                      score: nextScore,
                      completedAt:
                        nextIndex >= session.total ? new Date() : null,
                    });
                    setFeedback(null);
                  }, 700);
                  return;
                }
                const result = await answerQuizAction({
                  sessionId: session.id,
                  deckId,
                  cardId: card.id,
                  selectedOption: choice,
                });
                setFeedback(result.isCorrect ? "correct" : "wrong");
                window.setTimeout(() => {
                  setSession(result.session);
                  setFeedback(null);
                }, 700);
              })
            }
            type="button"
          >
            {choice}
          </button>
        ))}
      </div>

      {feedback ? (
        <p
          className={`text-center text-sm font-black ${
            feedback === "correct" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {feedback === "correct" ? "Correct! +10 XP" : "Not quite — keep going"}
        </p>
      ) : null}
    </section>
  );
}
