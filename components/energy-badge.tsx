import { getOrRefreshCredits } from "@/lib/data/credits";

export async function EnergyBadge({ userId }: { userId: string }) {
  const credits = await getOrRefreshCredits(userId);

  if (credits.isUnlimited) {
    return (
      <span className="energy-pill" title="Unlimited energy">
        ⚡ Unlimited
      </span>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((credits.periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <span className="energy-pill" title={`Refills in about ${daysLeft} day(s)`}>
      ⚡ {credits.balance}
      <span className="font-semibold opacity-70">/ {credits.periodGrant}</span>
    </span>
  );
}
