"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { answerQuizAction } from "@/lib/actions/quizzes";
import { useSwipe } from "@/lib/hooks/use-swipe";
import {
  answersMatch,
  buildQuizChoices,
  quizExplanation,
  resolveCorrectChoice,
} from "@/lib/quiz/choices";
import type { Flashcard, QuizSession } from "@/lib/types/flashcard";

function QuizFeedback({
  ok,
  why,
  onContinue,
}: {
  ok: boolean;
  why?: string | null;
  onContinue: () => void;
}) {
  return (
    <div className="play-why space-y-3">
      <p className={ok ? "play-why-ok" : "play-why-miss"}>
        {ok ? "Correct" : "Not quite"}
      </p>
      {why ? <p className="play-muted">{why}</p> : null}
      <button className="primary-button" onClick={onContinue} type="button">
        Continue
      </button>
    </div>
  );
}

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
  const t = useTranslations("quiz");
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [pendingSession, setPendingSession] = useState<QuizSession | null>(null);
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
  const explanation = card ? quizExplanation(card) : null;

  const completed =
    Boolean(session.completedAt) || session.currentIndex >= session.total;

  const swipe = useSwipe({});

  function continueQuiz() {
    if (!pendingSession) return;
    setSession(pendingSession);
    setPendingSession(null);
    setFeedback(null);
  }

  if (completed) {
    const pct = session.total
      ? Math.round((session.score / session.total) * 100)
      : 0;
    return (
      <section className="play-finish mx-auto max-w-lg">
        <div className="play-finish-cup" aria-hidden>
          {pct >= 50 ? "🏆" : "💀"}
        </div>
        <p className="eyebrow mt-2">{t("clear")}</p>
        <h2 className="page-title mt-2">
          {session.score}/{session.total}
        </h2>
        <p className="page-subtitle">{t("accuracy", { pct })}</p>
        {!readOnly ? (
          <div className="mt-8 flex justify-center gap-3">
            <button
              className="secondary-button"
              onClick={() => router.push(`/decks/${deckId}`)}
              type="button"
            >
              {t("backToDeck")}
            </button>
            <button
              className="primary-button"
              onClick={() => router.push(`/decks/${deckId}/study`)}
              type="button"
            >
              {t("studyCards")}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  if (!card) {
    return <p className="empty-state">{t("missing")}</p>;
  }

  return (
    <section className="play-stage play-stage--arena study-mobile mx-auto max-w-xl" {...swipe}>
      <div className="play-hud">
        <h2 className="play-hud-title">{t("title")}</h2>
        <span className="play-hud-score">
          {session.score}/{session.total}
          {` · ${session.currentIndex + 1}/${session.total}`}
        </span>
      </div>
      <p className="play-prompt">{card.front.replace(/\{\{blank\}\}/gi, "____")}</p>
      <div className="grid gap-2">
        {choices.map((choice, i) => (
          <button
            className="play-choice"
            disabled={isPending || Boolean(feedback)}
            key={choice}
            onClick={() =>
              startTransition(async () => {
                const correctChoice = resolveCorrectChoice(card);
                if (readOnly) {
                  const correct = answersMatch(choice, correctChoice);
                  const nextIndex = session.currentIndex + 1;
                  const nextScore = session.score + (correct ? 1 : 0);
                  setFeedback(correct ? "correct" : "wrong");
                  setPendingSession({
                    ...session,
                    currentIndex: nextIndex,
                    score: nextScore,
                    completedAt:
                      nextIndex >= session.total ? new Date() : null,
                  });
                  return;
                }
                const result = await answerQuizAction({
                  sessionId: session.id,
                  deckId,
                  cardId: card.id,
                  selectedOption: choice,
                });
                setFeedback(result.isCorrect ? "correct" : "wrong");
                setPendingSession(result.session);
              })
            }
            type="button"
          >
            <span className="play-choice-letter">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="play-choice-text">{choice}</span>
          </button>
        ))}
      </div>

      {feedback ? (
        <QuizFeedback
          ok={feedback === "correct"}
          onContinue={continueQuiz}
          why={explanation}
        />
      ) : null}
    </section>
  );
}
