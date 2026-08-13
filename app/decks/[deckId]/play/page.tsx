import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { listDueCardIds } from "@/lib/data/study";
import { templatesForDeck } from "@/lib/play/eligibility";

const GROUPS: { id: string; label: string }[] = [
  { id: "pairing", label: "Match" },
  { id: "recall", label: "Recall" },
  { id: "classify", label: "Sort" },
  { id: "picture", label: "Pictures" },
  { id: "quiz", label: "Quiz" },
  { id: "puzzle", label: "Puzzles" },
  { id: "arcade", label: "Quick fire" },
];

export default async function DeckPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ due?: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const { due } = await searchParams;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck || deck.generationStatus !== "complete" || !deck.cards.length) {
    notFound();
  }

  const dueOnly = due === "1";
  const dueIds = dueOnly
    ? new Set(await listDueCardIds(deck.id, session.user.id))
    : null;
  const cards = dueIds
    ? deck.cards.filter((card) => dueIds.has(card.id))
    : deck.cards;
  const templates = templatesForDeck(cards);
  const dueQuery = dueOnly ? "?due=1" : "";

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deck.id}`}>
        ← Back to deck
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">Classroom activities</p>
        <h1 className="page-title">Play · {deck.title}</h1>
        <p className="page-subtitle">
          Same cards, Wordwall-style templates. Play is free — energy is only
          for generating new cards.
        </p>
        <p className="mt-3 text-sm">
          {dueOnly ? (
            <Link className="text-button" href={`/decks/${deck.id}/play`}>
              Using due cards ({cards.length}) · Show all
            </Link>
          ) : (
            <Link
              className="text-button"
              href={`/decks/${deck.id}/play?due=1`}
            >
              Due today only
            </Link>
          )}
        </p>
      </div>
      {GROUPS.map((group) => {
        const items = templates.filter((item) => item.group === group.id);
        if (!items.length) return null;
        return (
          <section className="mb-8 space-y-3" key={group.id}>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) =>
                item.blocked ? (
                  <div
                    className="rounded-2xl border border-dashed border-[var(--border)] p-4 opacity-60"
                    key={item.id}
                  >
                    <p className="font-bold">{item.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.blocked}
                    </p>
                  </div>
                ) : (
                  <Link
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent)]"
                    href={`/decks/${deck.id}/play/${item.id}${dueQuery}`}
                    key={item.id}
                  >
                    <p className="font-bold">{item.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {item.blurb}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
