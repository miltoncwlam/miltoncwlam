import Link from "next/link";

import { CommunityCopyButton } from "@/components/community-copy-button";
import {
  encyclopediaBandFromTitle,
  formatGradeLabel,
  formatTagLabel,
} from "@/lib/community/hk-curriculum";
import type { CommunityDeckSummary } from "@/lib/data/community";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function kindLabel(kind: string, studio: Translate) {
  if (kind === "mindmap" || kind === "notes" || kind === "exam") return studio(kind);
  return kind;
}

export function CommunityDeckCard({
  deck,
  creatorName,
  t,
  studio,
  compact,
}: {
  deck: CommunityDeckSummary;
  creatorName: string;
  t: Translate;
  studio: Translate;
  compact?: boolean;
}) {
  const band = encyclopediaBandFromTitle(deck.title);
  const kinds = deck.artifactKinds
    .map((kind) => kindLabel(kind, studio))
    .filter(Boolean)
    .join(" · ");
  const stats = [
    deck.cardCount ? t("cards", { count: deck.cardCount }) : null,
    kinds || null,
    deck.ratingCount
      ? t("rating", { avg: deck.ratingAvg.toFixed(1), count: deck.ratingCount })
      : null,
    deck.copyCount ? t("copies", { count: deck.copyCount }) : null,
    `♥ ${deck.likeCount}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={`deck-card flex flex-col p-5 ${
        compact ? "min-w-[16rem] shrink-0 lg:min-w-0" : ""
      }`}
    >
      {deck.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="mb-3 h-28 w-full rounded-xl object-cover"
          src={deck.coverImageUrl}
        />
      ) : null}
      <p className="text-xs font-bold tracking-wide text-[var(--accent)]">
        {deck.isFeatured && !compact ? `${t("featured")} · ` : null}
        {formatTagLabel(deck.subjectTag)}
        {band
          ? ` · ${band === "primary" ? t("primary") : band === "junior" ? t("junior") : t("senior")}`
          : deck.gradeTag
            ? ` · ${formatGradeLabel(deck.gradeTag)}`
            : null}
      </p>
      <h2 className="mt-2 font-display text-lg font-bold text-[var(--ink)]">
        <Link className="hover:text-[var(--accent)]" href={`/community/${deck.id}`}>
          {deck.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {stats || t("notebook")}
      </p>
      <p className="mt-1 text-sm">
        <Link
          className="font-semibold text-[var(--accent)] hover:underline"
          href={`/community/u/${encodeURIComponent(deck.ownerUserId)}`}
        >
          {t("byCreator", { name: creatorName })}
        </Link>
      </p>
      <div className="mt-auto flex gap-2 pt-5">
        <Link className="secondary-button" href={`/community/${deck.id}`}>
          {t("study")}
        </Link>
        <CommunityCopyButton deckId={deck.id} />
      </div>
    </li>
  );
}
