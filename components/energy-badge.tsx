import { getOrRefreshCredits } from "@/lib/data/credits";
import { cn } from "@/lib/utils";

export async function EnergyBadge({ userId }: { userId: string }) {
  const credits = await getOrRefreshCredits(userId);
  const className =
    "inline-flex items-center gap-1 rounded-md border border-input bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground";

  if (credits.isUnlimited) {
    return (
      <span className={cn(className)} title="Unlimited energy">
        Energy Unlimited
      </span>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((credits.periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <span
      className={cn(className)}
      title={`Energy refills in about ${daysLeft} day(s)`}
    >
      Energy {credits.balance}
      <span className="font-semibold opacity-70">/ {credits.periodGrant}</span>
    </span>
  );
}
