import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassLinkControls } from "@/components/class-link-controls";
import { requireSession } from "@/lib/auth-server";
import { listClassLinksForDeck } from "@/lib/data/class-links";
import { getDeckWithCards } from "@/lib/data/decks";
import { listClassRunsForDeck } from "@/lib/data/games";
import { PLAY_TEMPLATES } from "@/lib/play/templates";

function templateName(id: string) {
  return PLAY_TEMPLATES.find((item) => item.id === id)?.name ?? id;
}

function shortUser(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default async function DeckClassPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();

  const [links, runs] = await Promise.all([
    listClassLinksForDeck(deck.id, session.user.id),
    listClassRunsForDeck(deck.id, session.user.id),
  ]);

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deck.id}`}>
        ← Back to deck
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">Class</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">
          Students copy this deck, then play with their own energy. Scores
          below are from homework started via a class link.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="text-xl font-black">Recent scores</h2>
          {runs.length ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Energy</th>
                    <th className="px-4 py-3">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr className="border-b border-slate-100" key={run.id}>
                      <td className="px-4 py-3 font-mono text-xs">
                        {shortUser(run.userId)}
                      </td>
                      <td className="px-4 py-3">{templateName(run.template)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {run.score}/{run.maxScore}
                      </td>
                      <td className="px-4 py-3">
                        {run.payout > 0 ? `+${run.payout}` : `−${run.stake}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {run.completedAt.toISOString().replace("T", " ").slice(0, 16)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
              No tagged homework runs yet. Create a class link, then wait for
              students to finish an activity.
            </p>
          )}
        </section>
        <aside>
          <ClassLinkControls deckId={deck.id} links={links} />
        </aside>
      </div>
    </main>
  );
}
