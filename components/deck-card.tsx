import Link from "next/link";

import type { DeckSummary } from "@/lib/types/flashcard";

const statusLabel = {
  pending: "Queued",
  processing: "Generating",
  complete: "Ready",
  failed: "Needs attention",
};

export function DeckCard({ deck }: { deck: DeckSummary }) {
  return (
    <Link className="deck-card group" href={`/decks/${deck.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="deck-card-kicker">{deck.sourceType}</p>
          <h2 className="deck-card-title group-hover:text-[var(--accent)]">
            {deck.title}
          </h2>
        </div>
        <span
          className={`deck-card-badge ${
            deck.generationStatus === "failed"
              ? "is-failed"
              : deck.generationStatus === "processing" ||
                  deck.generationStatus === "pending"
                ? "is-busy"
                : ""
          }`}
        >
          {statusLabel[deck.generationStatus]}
        </span>
      </div>
      <div className="deck-card-meta">
        <span>
          {deck.cardCount} cards
          {deck.folderTag ? ` · ${deck.folderTag}` : ""}
          {deck.archivedAt ? " · Archived" : ""}
        </span>
        <span>
          {deck.visibility === "public"
            ? "Public"
            : deck.visibility === "unlisted" || deck.isShared
              ? "Unlisted"
              : "Private"}
        </span>
      </div>
      {deck.generationError ? (
        <p className="mt-3 line-clamp-2 text-sm font-semibold text-rose-600">
          {deck.generationError}
        </p>
      ) : null}
    </Link>
  );
}
