import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayDispatcher } from "@/components/play/play-dispatcher";
import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { listDueCardIds } from "@/lib/data/study";
import { templateReason } from "@/lib/play/eligibility";
import { isPlayTemplateId } from "@/lib/play/templates";

export default async function DeckPlayTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string; template: string }>;
  searchParams: Promise<{ t?: string; due?: string }>;
}) {
  const session = await requireSession();
  const { deckId, template } = await params;
  const { t, due } = await searchParams;
  if (!isPlayTemplateId(template)) notFound();

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
  const blocked = templateReason(template, cards);

  return (
    <main className="page-shell">
      <div className="mt-4 mb-4">
        <Link className="text-button" href={`/decks/${deck.id}/play${dueOnly ? "?due=1" : ""}`}>
          ← Activities
        </Link>
      </div>
      {blocked ? (
        <p className="empty-state">{blocked}</p>
      ) : (
        <PlayDispatcher
          cards={cards}
          deckId={deck.id}
          key={t ?? "play"}
          template={template}
        />
      )}
    </main>
  );
}
