import type { CardRating } from "@/lib/types/flashcard";

export type SrsState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
  lastRating: CardRating | null;
};

export function defaultSrsState(now = new Date()): SrsState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now,
    lastRating: null,
  };
}

/** SM-2 adapted to hard / ok / easy ratings. */
export function applySm2(
  previous: SrsState,
  rating: CardRating,
  now = new Date(),
): SrsState {
  const quality = rating === "hard" ? 2 : rating === "ok" ? 3 : 5;
  let easeFactor = previous.easeFactor;
  let intervalDays = previous.intervalDays;
  let repetitions = previous.repetitions;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueAt,
    lastRating: rating,
  };
}
