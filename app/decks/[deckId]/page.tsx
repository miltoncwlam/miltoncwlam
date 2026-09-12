import Link from "next/link";
import { notFound } from "next/navigation";

import { CommunityVisibilityControls } from "@/components/community-visibility-controls";
import { ExamLaneChips } from "@/components/exam-lane-chips";
import { DeckLibraryControls } from "@/components/deck-library-controls";
import { RetryIngestButton } from "@/components/generation-jobs";
import { NotebookChat } from "@/components/notebook-chat";
import { NotebookStudio } from "@/components/notebook-studio";
import { ShareControls } from "@/components/share-controls";
import {
  deleteDeckAction,
  updateCardAction,
} from "@/lib/actions/decks";
import { requireSession } from "@/lib/auth-server";
import { listDeckArtifacts } from "@/lib/data/artifacts";
import { listNotebookChatMessages } from "@/lib/data/notebook-chat";
import { getDeckWithCards } from "@/lib/data/decks";
import { env } from "@/lib/env";
import { TOPIC_SOURCE_MIME } from "@/lib/llm/generate-flashcards";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";

function previewSource(text: string | null | undefined) {
  const value = (text ?? "").trim();
  if (!value) return "";
  if (value.length <= 4000) return value;
  return `${value.slice(0, 4000)}…`;
}

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
  const artifacts = await listDeckArtifacts(deck.id);
  const chatMessages = await listNotebookChatMessages(deck.id, session.user.id);
  const notes = artifacts.find(
    (item) => item.kind === "notes" && item.generationStatus === "complete",
  );
  const mindmap = artifacts.find(
    (item) => item.kind === "mindmap" && item.generationStatus === "complete",
  );
  const exam = artifacts.find(
    (item) => item.kind === "exam" && item.generationStatus === "complete",
  );
  const hasSource =
    deck.generationStatus === "complete" && Boolean(deck.sourceContent);
  const isProcessing =
    deck.generationStatus === "pending" ||
    deck.generationStatus === "processing";
  const isFailed = deck.generationStatus === "failed";
  const isEmpty = deck.cards.length === 0;
  const canShare = hasSource;
  const sourcePreview = previewSource(deck.sourceContent);
  const sourceHeading =
    deck.sourceFilename?.trim() ||
    (deck.sourceType === "url" ? "Linked page" : "Pasted notes");

  return (
    <main className="page-shell">
      <Link className="text-button no-print" href="/decks">
        ← Back to decks
      </Link>
      <div className="no-print mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <p className="eyebrow">{sourceLabel} source</p>
          <h1 className="page-title">{deck.title}</h1>
          <p className="page-subtitle">
            {deck.cards.length} cards
            {artifacts.length ? ` · ${artifacts.length} studio items` : ""}
            {" · "}
            {deck.generationProvider ?? "sample"} · {deck.generationStatus}
          </p>
          <ExamLaneChips deckId={deck.id} examSystem={deck.examSystem} />
        </div>
        <div className="no-print flex flex-wrap gap-3">
          {canStudy ? (
            <>
              <Link
                className="primary-button"
                href={`/decks/${deck.id}/study`}
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
          ) : isFailed ? (
            <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
              Study unavailable — generation failed
            </p>
          ) : isProcessing ? (
            <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
              Reading your source in the background
            </p>
          ) : hasSource && isEmpty ? (
            <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
              Generate flashcards in the studio to study
            </p>
          ) : null}
        </div>
      </div>

      {isFailed ? (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <p className="font-black">Generation failed</p>
          <p className="mt-2 text-sm">
            {deck.generationError ?? "Something went wrong while reading this source."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <RetryIngestButton deckId={deck.id} />
          </div>
        </section>
      ) : (
        <div className="notebook-workspace mt-10 grid gap-8 lg:grid-cols-2">
          <section className="notebook-source">
            <p className="eyebrow">Source</p>
            <h2 className="mt-2 text-2xl font-black">{sourceHeading}</h2>
            {isProcessing ? (
              <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
                Reading your source. You can leave this page.
              </p>
            ) : null}
            {sourcePreview ? (
              <pre className="notebook-source-body">{sourcePreview}</pre>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                {isProcessing
                  ? "The text will appear here as soon as we finish reading."
                  : "This notebook has no source text yet."}
              </p>
            )}
          </section>
          <NotebookStudio
            cardCount={deck.cards.length}
            deckId={deck.id}
            exam={exam ? (exam.payload as ExamPayload) : null}
            hasSource={hasSource}
            mindmap={mindmap ? (mindmap.payload as MindmapPayload) : null}
            notes={notes ? (notes.payload as NotesPayload) : null}
          />
        </div>
      )}
      {!isFailed ? (
        <NotebookChat
          deckId={deck.id}
          hasSource={hasSource}
          initialMessages={chatMessages.map((entry) => ({
            id: entry.id,
            role: entry.role,
            content: entry.content,
          }))}
        />
      ) : null}

      {!isFailed && isEmpty && !hasSource && !isProcessing ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          This notebook has no source yet. Create a new notebook from a topic, notes, URL, or file.
        </p>
      ) : null}

      <div className="no-print mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          {deck.cards.length ? (
            <>
              <h2 className="text-xl font-black">Review and edit cards</h2>
              {deck.cards.map((card, index) => (
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
              ))}
            </>
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
              <CommunityVisibilityControls
                deckId={deck.id}
                moderationReasons={deck.moderationReasons}
                moderationStatus={deck.moderationStatus}
                visibility={deck.visibility}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Sharing unlocks when this notebook has a source.
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-bold">Deck actions</p>
            <form action={deleteDeckAction} className="mt-4">
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
