/** Hong Kong calendar streak math. No freeze. */

export type StreakRecord = {
  currentCount: number;
  longestCount: number;
  lastHkDate: string | null;
};

export type VisibleStreak = {
  current: number;
  longest: number;
  activeToday: boolean;
};

const HK = "Asia/Hong_Kong";
const DAY_MS = 24 * 60 * 60 * 1000;

export function hongKongDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function nextStreak(record: StreakRecord, today: string): StreakRecord {
  if (record.lastHkDate === today) return record;
  if (record.lastHkDate && isNextCalendarDay(record.lastHkDate, today)) {
    const currentCount = record.currentCount + 1;
    return {
      currentCount,
      longestCount: Math.max(record.longestCount, currentCount),
      lastHkDate: today,
    };
  }
  return {
    currentCount: 1,
    longestCount: Math.max(record.longestCount, 1),
    lastHkDate: today,
  };
}

export function visibleStreak(record: StreakRecord, today: string): VisibleStreak {
  const longest = record.longestCount;
  if (!record.lastHkDate) {
    return { current: 0, longest, activeToday: false };
  }
  if (record.lastHkDate === today) {
    return { current: record.currentCount, longest, activeToday: true };
  }
  if (isNextCalendarDay(record.lastHkDate, today)) {
    return { current: record.currentCount, longest, activeToday: false };
  }
  return { current: 0, longest, activeToday: false };
}

function isNextCalendarDay(prev: string, today: string) {
  const from = Date.parse(`${prev}T00:00:00+08:00`);
  const to = Date.parse(`${today}T00:00:00+08:00`);
  return to - from === DAY_MS;
}
