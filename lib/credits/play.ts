/** Energy to start a classroom game. Win it back (and a bonus) if you score well. */
export const PLAY_STAKE = 20;

/** Below this, the ante is lost. */
export const PLAY_WIN_RATIO = 0.5;

/** Rage-retry cap so quitting cannot drain a weekly grant in one sitting. */
export const PLAY_STAKE_LIMIT_HOUR = 10;

/** Gameshow awards up to 300 per card; other templates stay at 1 per item. */
export const PLAY_MAX_POINTS_PER_CARD = 300;

export function playPayout(
  score: number,
  maxScore: number,
  stake = PLAY_STAKE,
): number {
  if (stake <= 0 || maxScore <= 0) return 0;
  const pct = Math.max(0, score) / maxScore;
  if (pct < PLAY_WIN_RATIO) return 0;
  if (pct >= 1) return stake * 2;
  if (pct >= 0.8) return stake + Math.round(stake * 0.5);
  return stake;
}

export function playNet(score: number, maxScore: number, stake = PLAY_STAKE) {
  return playPayout(score, maxScore, stake) - stake;
}

export function maxPlayScoreForCards(cardCount: number) {
  return Math.max(1, cardCount) * PLAY_MAX_POINTS_PER_CARD;
}

/** Reject client-reported scores that cannot come from a real round. */
export function assertPlayScore(input: {
  score: number;
  maxScore: number;
  cardCount: number;
}) {
  const score = input.score;
  const maxScore = input.maxScore;
  if (
    !Number.isFinite(score) ||
    !Number.isFinite(maxScore) ||
    !Number.isInteger(score) ||
    !Number.isInteger(maxScore)
  ) {
    throw new Error("Invalid score.");
  }
  if (score < 0 || maxScore < 1 || score > maxScore) {
    throw new Error("Invalid score.");
  }
  if (maxScore > maxPlayScoreForCards(input.cardCount)) {
    throw new Error("Invalid score.");
  }
}
