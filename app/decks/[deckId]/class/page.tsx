import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassLinkControls } from "@/components/class-link-controls";
import { requireSession } from "@/lib/auth-server";
import { listClassLinksForDeck } from "@/lib/data/class-links";
import { getDeckWithCards } from "@/lib/data/decks";

export default async function DeckClassPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();

  const links = await listClassLinksForDeck(deck.id, session.user.id);

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deck.id}`}>
        ← Back to deck
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">Class</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">
          Students can copy this deck into their own library.
        </p>
      </div>

      <section className="max-w-md">
        <ClassLinkControls deckId={deck.id} links={links} />
      </section>
    </main>
  );
}
