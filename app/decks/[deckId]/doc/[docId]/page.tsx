import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { MindmapTree } from "@/components/mindmap-tree";
import { StudyNotesView } from "@/components/study-notes-view";
import { deleteDocumentAction, updateCardAction } from "@/lib/actions/decks";
import { requireSession } from "@/lib/auth-server";
import { isV45FeaturesLive } from "@/lib/campaign";
import { getDeckArtifactById } from "@/lib/data/artifacts";
import { getDeckWithCards } from "@/lib/data/decks";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";

const artifactIdSchema = z.string().uuid();

export default async function NotebookDocumentPage({
  params,
}: {
  params: Promise<{ deckId: string; docId: string }>;
}) {
  const session = await requireSession();
  const { deckId, docId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();
  const t = await getTranslations("studio");
  const back = (
    <Link className="text-button no-print" href={`/decks/${deck.id}`}>
      ← {t("backToNotebook")}
    </Link>
  );

  if (docId === "source") {
    const heading =
      deck.sourceFilename?.trim() ||
      (deck.sourceType === "url" ? "Linked page" : "Pasted notes");
    return (
      <main className="page-shell">
        {back}
        <p className="eyebrow mt-6">{t("sourceButton")}</p>
        <h1 className="page-title">{heading}</h1>
        {deck.sourceContent?.trim() ? (
          <pre className="notebook-source-body">{deck.sourceContent.trim()}</pre>
        ) : (
          <p className="mt-4 text-sm text-slate-600">{t("noSource")}</p>
        )}
      </main>
    );
  }

  if (docId === "cards") {
    return (
      <main className="page-shell">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          {back}
          {deck.cards.length ? (
            <form action={deleteDocumentAction}>
              <input name="deckId" type="hidden" value={deck.id} />
              <input name="kind" type="hidden" value="cards" />
              <button className="secondary-button" type="submit">
                {t("deleteDocument")}
              </button>
            </form>
          ) : null}
        </div>
        <h1 className="page-title mt-6">{t("cards")}</h1>
        {deck.cards.length ? (
          <section className="mt-6 space-y-4">
            {deck.cards.map((card, index) => (
              <form
                action={updateCardAction}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                key={card.id}
              >
                <input name="cardId" type="hidden" value={card.id} />
                <input name="deckId" type="hidden" value={deck.id} />
                <p className="mb-4 text-xs font-black uppercase tracking-widest text-indigo-600">
                  {t("cards")} {index + 1}
                  {card.cardType && card.cardType !== "qa" ? ` · ${card.cardType}` : ""}
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
                    <input className="field" defaultValue={card.hint ?? ""} name="hint" />
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
          </section>
        ) : (
          <p className="mt-4 text-sm text-slate-600">{t("noSource")}</p>
        )}
      </main>
    );
  }

  if (!artifactIdSchema.safeParse(docId).success) notFound();
  const artifact = await getDeckArtifactById(deck.id, docId);
  if (!artifact) notFound();
  const payload = artifact.payload as NotesPayload & MindmapPayload & ExamPayload;
  const title =
    payload.title?.trim() ||
    (artifact.kind === "notes"
      ? t("notes")
      : artifact.kind === "mindmap"
        ? t("mindmap")
        : t("exam"));

  return (
    <main className="page-shell">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        {back}
        <form action={deleteDocumentAction}>
          <input name="deckId" type="hidden" value={deck.id} />
          <input name="artifactId" type="hidden" value={artifact.id} />
          <button className="secondary-button" type="submit">
            {t("deleteDocument")}
          </button>
        </form>
      </div>
      {artifact.generationStatus === "failed" ? (
        <p className="mt-6 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {artifact.generationError || t("generating")}
        </p>
      ) : null}
      {artifact.generationStatus === "processing" || artifact.generationStatus === "pending" ? (
        <p className="mt-6 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-950">
          {t("generating")}
        </p>
      ) : null}
      {artifact.kind === "notes" && artifact.generationStatus === "complete" ? (
        <div className="mt-6">
          <StudyNotesView
            markdown={(artifact.payload as NotesPayload).markdown}
            title={title}
          />
        </div>
      ) : null}
      {artifact.kind === "mindmap" &&
      artifact.generationStatus === "complete" &&
      (artifact.payload as MindmapPayload).nodes?.length ? (
        <div className="mt-6">
          <MindmapTree
            deckId={deck.id}
            editable={isV45FeaturesLive()}
            nodes={(artifact.payload as MindmapPayload).nodes}
            title={title}
          />
        </div>
      ) : null}
      {artifact.kind === "exam" && artifact.generationStatus === "complete" ? (
        <ExamDocument
          deckId={deck.id}
          exam={artifact.payload as ExamPayload}
          questionsLabel={t("questions")}
          takeExamLabel={t("takeExam")}
        />
      ) : null}
      {artifact.generationStatus !== "complete" ? (
        <h1 className="page-title mt-6">{title}</h1>
      ) : null}
    </main>
  );
}

function ExamDocument({
  deckId,
  exam,
  questionsLabel,
  takeExamLabel,
}: {
  deckId: string;
  exam: ExamPayload;
  questionsLabel: string;
  takeExamLabel: string;
}) {
  return (
    <article className="mt-6">
      <h1 className="page-title">{exam.title}</h1>
      {exam.instructions ? (
        <p className="page-subtitle mt-2">{exam.instructions}</p>
      ) : null}
      <p className="mt-2 text-sm text-slate-600">
        {exam.questions.length} {questionsLabel}
      </p>
      <ol className="mt-6 space-y-4">
        {exam.questions.map((question, index) => (
          <li
            className="rounded-2xl border border-slate-200 bg-white p-5"
            key={question.id}
          >
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
              {index + 1} · {question.marks}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{question.prompt}</p>
          </li>
        ))}
      </ol>
      <a className="primary-button no-print mt-6 inline-flex" href={`/decks/${deckId}/exam`}>
        {takeExamLabel}
      </a>
    </article>
  );
}
