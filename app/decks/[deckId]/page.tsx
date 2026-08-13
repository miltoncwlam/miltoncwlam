import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassLinkControls } from "@/components/class-link-controls";
import { CommunityVisibilityControls } from "@/components/community-visibility-controls";
import { DeckLibraryControls } from "@/components/deck-library-controls";
import { ShareControls } from "@/components/share-controls";
import {
  deleteDeckAction,
  regenerateDeckAction,
  updateCardAction,
} from "@/lib/actions/decks";
import { requireSession } from "@/lib/auth-server";
import { listClassLinksForDeck } from "@/lib/data/class-links";
import { getDeckWithCards } from "@/lib/data/decks";
import { env } from "@/lib/env";
import { TOPIC_SOURCE_MIME } from "@/lib/llm/generate-flashcards";

export default async function DeckDetailPage({
  params,
}: PageProps<"/decks/[deckId]">) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();

  const sourceLabel =
    deck.sourceMimeType === TOPIC_SOURCE_MIME ? "topic" : deck.sourceType;
  const canStudy =
    deck.generationStatus === "complete" && deck.cards.length > 0;
  const canShare = canStudy;
  const classLinks = canStudy
    ? await listClassLinksForDeck(deck.id, session.user.id)
    : [];
  const canRegenerate = Boolean(
    deck.generationProvider &&
      (deck.sourceContent || deck.storagePath),
  );
  const isFailed = deck.generationStatus === "failed";
  const isEmpty = deck.cards.length === 0;

  return (
    <main className="page-shell">
      <Link className="text-button" href="/decks">
        ← Back to decks
      </Link>
      <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <p className="eyebrow">{sourceLabel} source</p>
          <h1 className="page-title">{deck.title}</h1>
          <p className="page-subtitle">
            {deck.cards.length} cards · {deck.generationProvider ?? "sample"} ·{" "}
            {deck.generationStatus}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canStudy ? (
            <>
              <Link
                className="primary-button"
                href={`/decks/${deck.id}/study?new=1`}
              >
                Study cards
              </Link>
              <Link
                className="secondary-button"
                href={`/decks/${deck.id}/study?new=1&due=1`}
              >
                Due today
              </Link>
              <Link
                className="secondary-button"
                href={`/decks/${deck.id}/study?new=1&shuffle=true`}
              >
                Shuffle
              </Link>
              <Link className="secondary-button" href={`/decks/${deck.id}/quiz`}>
                Quiz battle
              </Link>
              <Link className="secondary-button" href={`/decks/${deck.id}/play`}>
                Play activities
              </Link>
            </>
          ) : (
            <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
              {isFailed
                ? "Study unavailable — generation failed"
                : isEmpty
                  ? "Study unavailable — no cards yet"
                  : "Study unavailable until generation finishes"}
            </p>
          )}
        </div>
      </div>

      {isFailed ? (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <p className="font-black">Generation failed</p>
          <p className="mt-2 text-sm">
            {deck.generationError ?? "Something went wrong while creating cards."}
          </p>
          {canRegenerate ? (
            <form action={regenerateDeckAction} className="mt-4">
              <input name="deckId" type="hidden" value={deck.id} />
              <button className="secondary-button" type="submit">
                Regenerate cards
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {!isFailed && isEmpty ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          This deck has no cards yet.{" "}
          {deck.generationStatus === "processing"
            ? "Generation is still running — refresh in a moment."
            : "Try regenerating or create a sample deck instead."}
        </p>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-xl font-black">Review and edit cards</h2>
          {deck.cards.length ? (
            deck.cards.map((card, index) => (
              <form
                action={updateCardAction}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                key={card.id}
              >
                <input name="cardId" type="hidden" value={card.id} />
                <input name="deckId" type="hidden" value={deck.id} />
                <p className="mb-4 text-xs font-black uppercase tracking-widest text-indigo-600">
                  Card {index + 1}
                  {card.cardType && card.cardType !== "qa"
                    ? ` · ${card.cardType}`
                    : ""}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-bold">Front</span>
                    <textarea
                      className="field min-h-28"
                      defaultValue={card.front}
                      name="front"
                      required
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold">Back</span>
                    <textarea
                      className="field min-h-28"
                      defaultValue={card.back}
                      name="back"
                      required
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold">Hint</span>
                    <input
                      className="field"
                      defaultValue={card.hint ?? ""}
                      name="hint"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold">Category</span>
                    <input
                      className="field"
                      defaultValue={card.category ?? ""}
                      name="category"
                    />
                  </label>
                </div>
                <button className="secondary-button mt-4" type="submit">
                  Save card
                </button>
              </form>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
              No cards to review yet.
            </p>
          )}
        </section>

        <aside className="space-y-5">
          <DeckLibraryControls
            archived={Boolean(deck.archivedAt)}
            deckId={deck.id}
            folderTag={deck.folderTag}
            title={deck.title}
          />
          {canShare ? (
            <>
              <ShareControls
                appUrl={env.NEXT_PUBLIC_APP_URL}
                deckId={deck.id}
                isShared={deck.isShared}
              />
              <ClassLinkControls deckId={deck.id} links={classLinks} />
              <CommunityVisibilityControls
                deckId={deck.id}
                moderationReasons={deck.moderationReasons}
                moderationStatus={deck.moderationStatus}
                visibility={deck.visibility}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Sharing unlocks when this deck is complete and has cards.
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-bold">Deck actions</p>
            {canRegenerate ? (
              <form action={regenerateDeckAction} className="mt-4">
                <input name="deckId" type="hidden" value={deck.id} />
                <button className="secondary-button w-full" type="submit">
                  Regenerate cards
                </button>
              </form>
            ) : null}
            <form action={deleteDeckAction} className={canRegenerate ? "mt-3" : "mt-4"}>
              <input name="deckId" type="hidden" value={deck.id} />
              <button
                className="w-full rounded-full border border-rose-200 px-4 py-2 font-bold text-rose-700 hover:bg-rose-50"
                type="submit"
              >
                Delete deck
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
