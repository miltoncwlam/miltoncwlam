export function clampStars(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function ratingAverage(stars: number[]): { avg: number; count: number } {
  const values = stars.map(clampStars);
  if (!values.length) return { avg: 0, count: 0 };
  const sum = values.reduce((total, star) => total + star, 0);
  const avg = Math.round((sum / values.length) * 10) / 10;
  return { avg, count: values.length };
}
