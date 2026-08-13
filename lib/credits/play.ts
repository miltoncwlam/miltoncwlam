/** Energy to start a classroom game. Win it back (and a bonus) if you score well. */
export const PLAY_STAKE = 20;

/** Below this, the ante is lost. */
export const PLAY_WIN_RATIO = 0.5;

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
