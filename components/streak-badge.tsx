import { getTranslations } from "next-intl/server";

import { getStreak } from "@/lib/data/streaks";
import { cn } from "@/lib/utils";

export async function StreakBadge({ userId }: { userId: string }) {
  const streak = await getStreak(userId);
  const t = await getTranslations("streak");
  const className =
    "inline-flex items-center gap-1 rounded-md border border-input bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground";

  return (
    <span
      className={cn(className, streak.current === 0 ? "opacity-70" : "")}
      title={t("title", { count: streak.current, longest: streak.longest })}
    >
      <span aria-hidden>🔥</span>
      {t("label", { count: streak.current })}
    </span>
  );
}