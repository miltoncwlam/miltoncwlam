import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CommunityDeckCard } from "@/components/community-deck-card";
import { requireSession } from "@/lib/auth-server";
import { isV44FeaturesLive } from "@/lib/campaign";
import { displayNamesForUsers } from "@/lib/clerk";
import { communityCreatorName } from "@/lib/community/copies";
import { listPublicCommunityDecks } from "@/lib/data/community";

export default async function CommunityCreatorPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  if (!isV44FeaturesLive()) notFound();
  await requireSession();
  const { userId: rawId } = await params;
  const userId = decodeURIComponent(rawId).trim();
  if (!userId) notFound();

  const t = await getTranslations("community");
  const studio = await getTranslations("studio");
  const decks = await listPublicCommunityDecks({ userId });
  if (!decks.length) notFound();

  const names = await displayNamesForUsers([userId]);
  const name = communityCreatorName(userId, names);
  const totalCopies = decks.reduce((sum, deck) => sum + deck.copyCount, 0);
  const translate = t as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const studioTranslate = studio as unknown as (key: string) => string;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
      <header className="space-y-2">
        <Link
          className="text-sm font-semibold text-[var(--accent)]"
          href="/community"
        >
          ← {t("title")}
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
          {t("creatorTitle", { name })}
        </h1>
        <p className="text-[var(--muted)]">
          {t("creatorSubtitle")}
          {totalCopies
            ? ` · ${t("totalCopies", { count: totalCopies })}`
            : null}
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => (
          <CommunityDeckCard
            creatorName={name}
            deck={deck}
            key={deck.id}
            showV43
            studio={studioTranslate}
            t={translate}
          />
        ))}
      </ul>
    </main>
  );
}
