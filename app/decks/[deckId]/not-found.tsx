import Link from "next/link";

export default function DeckNotFound() {
  return (
    <main className="page-shell">
      <section className="empty-state">
        <h1 className="text-3xl font-black">Deck not found</h1>
        <p className="mt-2 text-slate-600">It may have been deleted or belongs to another user.</p>
        <Link className="primary-button mt-6" href="/decks">Back to my decks</Link>
      </section>
    </main>
  );
}
