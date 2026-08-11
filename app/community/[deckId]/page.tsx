import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CommunityCopyButton } from "@/components/community-copy-button";
import { CommunitySocial } from "@/components/community-social";
import { StudyPlayer } from "@/components/study-player";
import { requireSession } from "@/lib/auth-server";
import {
  formatGradeLabel,
  formatTagLabel,
} from "@/lib/community/hk-curriculum";
import { getPublicCommunityDeck } from "@/lib/data/community";
import { pool } from "@/lib/db";
import { listDeckComments, userLikedDeck } from "@/lib/data/social";

export default async function CommunityDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getPublicCommunityDeck(deckId);
  if (!deck) notFound();
  const t = await getTranslations("community");
  const [liked, comments, meta] = await Promise.all([
    userLikedDeck(deck.id, session.user.id),
    listDeckComments(deck.id),
    pool.query<{ like_count: number; is_featured: boolean }>(
      `select like_count, is_featured from decks where id = $1`,
      [deck.id],
    ),
  ]);

  const subjectLabel = formatTagLabel(deck.subjectTag);
  const gradeLabel = formatGradeLabel(deck.gradeTag);
  const metaBits = [
    subjectLabel,
    gradeLabel || null,
    t("cards", { count: deck.cards.length }),
    deck.isSeed ? t("bySeed") : null,
    meta.rows[0]?.is_featured ? t("featured") : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            className="text-sm font-semibold text-[var(--accent)]"
            href="/community"
          >
            ← {t("title")}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
            {deck.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{metaBits.join(" · ")}</p>
        </div>
        <CommunityCopyButton deckId={deck.id} />
      </div>
      <CommunitySocial
        comments={comments}
        deckId={deck.id}
        likeCount={meta.rows[0]?.like_count ?? 0}
        liked={liked}
      />
      <StudyPlayer cards={deck.cards} deckId={deck.id} readOnly />
    </main>
  );
}
