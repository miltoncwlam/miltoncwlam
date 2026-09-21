import type { Flashcard } from "@/lib/types/flashcard";
import type { WrongQuestionItem } from "@/lib/types/notebook";

export const REVIEW_QUEUE_CAP = 50;

export type DueCardReview = {
  kind: "card";
  dueAt: Date;
  deckId: string;
  deckTitle: string;
  card: Flashcard;
};

export type DueWrongReview = {
  kind: "wrong";
  dueAt: Date;
  deckId: string;
  deckTitle: string;
  item: WrongQuestionItem;
};

export type ReviewQueueItem = DueCardReview | DueWrongReview;

export type ExamScorePoint = {
  score: number;
  maxScore: number;
};

/** Mix due cards and due 錯題 by due date, oldest first, then cap. */
export function mergeReviewQueue(
  cards: DueCardReview[],
  wrongs: DueWrongReview[],
  cap = REVIEW_QUEUE_CAP,
): ReviewQueueItem[] {
  return [...cards, ...wrongs]
    .sort((a, b) => {
      const byDue = a.dueAt.getTime() - b.dueAt.getTime();
      if (byDue !== 0) return byDue;
      if (a.kind !== b.kind) return a.kind === "wrong" ? -1 : 1;
      return 0;
    })
    .slice(0, Math.max(0, cap));
}

export function examPercent(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export function examTrend(
  current: number,
  previous: number | undefined,
): "up" | "down" | "same" | null {
  if (previous == null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "same";
}

/** Newest-first attempts become oldest-first percents for a sparkline. */
export function sparklinePercents(
  attemptsNewestFirst: ExamScorePoint[],
  limit = 10,
): number[] {
  return attemptsNewestFirst
    .slice(0, limit)
    .reverse()
    .map((item) => examPercent(item.score, item.maxScore));
}
