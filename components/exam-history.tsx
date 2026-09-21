import { getTranslations } from "next-intl/server";

import {
  examPercent,
  examTrend,
  sparklinePercents,
} from "@/lib/study/review-queue";
import type { ExamAttempt } from "@/lib/types/notebook";

function ScoreSparkline({ percents }: { percents: number[] }) {
  if (percents.length < 2) return null;
  const width = 160;
  const height = 36;
  const max = 100;
  const step = percents.length === 1 ? 0 : width / (percents.length - 1);
  const points = percents
    .map((percent, index) => {
      const x = index * step;
      const y = height - (Math.min(100, Math.max(0, percent)) / max) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      aria-hidden
      className="mt-3 text-emerald-700"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export async function ExamHistory({ attempts }: { attempts: ExamAttempt[] }) {
  const t = await getTranslations("exam");
  if (!attempts.length) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          {t("history")}
        </p>
        <p className="mt-2">{t("historyEmpty")}</p>
      </section>
    );
  }

  const percents = sparklinePercents(attempts);
  const newest = attempts[0];
  const previous = attempts[1];
  const newestPercent = examPercent(newest.score, newest.maxScore);
  const previousPercent = previous
    ? examPercent(previous.score, previous.maxScore)
    : undefined;
  const trend = examTrend(newestPercent, previousPercent);

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            {t("history")}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {t("latestScore", { percent: newestPercent })}
            {trend === "up" ? ` · ${t("trendUp")}` : ""}
            {trend === "down" ? ` · ${t("trendDown")}` : ""}
            {trend === "same" ? ` · ${t("trendSame")}` : ""}
          </p>
        </div>
        <ScoreSparkline percents={percents} />
      </div>
      <ol className="mt-4 space-y-2">
        {attempts.map((attempt, index) => {
          const percent = examPercent(attempt.score, attempt.maxScore);
          const older = attempts[index + 1];
          const olderPercent = older
            ? examPercent(older.score, older.maxScore)
            : undefined;
          const rowTrend = examTrend(percent, olderPercent);
          return (
            <li
              className="flex items-center justify-between gap-3 text-sm"
              key={attempt.id}
            >
              <span className="text-slate-500">
                {attempt.createdAt.toISOString().slice(0, 10)}
              </span>
              <span className="font-semibold">
                {attempt.score}/{attempt.maxScore} · {t("percent", { value: percent })}
                {rowTrend === "up" ? " ↑" : ""}
                {rowTrend === "down" ? " ↓" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
