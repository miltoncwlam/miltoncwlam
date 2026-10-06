"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { useGenerationJobs } from "@/components/generation-jobs";
import { ExamLaneChips } from "@/components/exam-lane-chips";
import { MindmapTree } from "@/components/mindmap-tree";
import { StudyNotesView } from "@/components/study-notes-view";
import { updateCardAction } from "@/lib/actions/decks";
import { friendlyGenerateError } from "@/lib/friendly-generate-error";
import { isV45FeaturesLive } from "@/lib/campaign";
import type { ExamSystem } from "@/lib/llm/exam-profiles";
import { EXAM_QUESTION_TYPES, type ArtifactKind } from "@/lib/types/notebook";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";
import type { AppLocale, StudioDepth, StudioPurpose } from "@/lib/i18n/locales";

type LibraryDocument = {
  id: string;
  kind: ArtifactKind;
  title: string;
  status: "pending" | "processing" | "complete" | "failed";
  error: string | null;
  notes: NotesPayload | null;
  mindmap: MindmapPayload | null;
  exam: ExamPayload | null;
};

type LibraryCard = {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  category: string | null;
  cardType: string;
};

type StudioKind = ArtifactKind | "cards";

export function NotebookStudio({
  deckId,
  notes,
  mindmap,
  exam,
  hasSource,
  cardCount = 0,
  library = null,
}: {
  deckId: string;
  notes: NotesPayload | null;
  mindmap: MindmapPayload | null;
  exam: ExamPayload | null;
  hasSource: boolean;
  cardCount?: number;
  library?: {
    sourceHeading: string;
    sourcePreview: string;
    documents: LibraryDocument[];
    cards: LibraryCard[];
    examSystem: ExamSystem;
  } | null;
}) {
  const t = useTranslations("studio");
  const locale = useLocale() as AppLocale;
  const { jobs } = useGenerationJobs();
  const [pendingKinds, setPendingKinds] = useState<Set<StudioKind>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([...EXAM_QUESTION_TYPES]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [depth, setDepth] = useState<StudioDepth>("basic");
  const [purpose, setPurpose] = useState<StudioPurpose>("starter");
  const [requirements, setRequirements] = useState("");
  const [examOpen, setExamOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const tiles = useMemo(
    () =>
      [
        { kind: "mindmap" as const, title: t("mindmap"), ready: Boolean(mindmap?.nodes?.length) },
        { kind: "notes" as const, title: t("notes"), ready: Boolean(notes?.markdown) },
        { kind: "exam" as const, title: t("exam"), ready: Boolean(exam?.questions?.length) },
        { kind: "cards" as const, title: t("cards"), ready: cardCount > 0 },
      ] as const,
    [cardCount, exam, mindmap, notes, t],
  );

  function setKindPending(kind: StudioKind, on: boolean) {
    setPendingKinds((current) => {
      const next = new Set(current);
      if (on) next.add(kind);
      else next.delete(kind);
      return next;
    });
  }

  async function generate(kind: StudioKind) {
    if (!hasSource) return;
    setError(null);
    setErrorCode(null);
    setKindPending(kind, true);
    try {
      const response = await fetch(`/api/decks/${deckId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          language: locale,
          depth,
          purpose,
          durationMinutes,
          types: kind === "exam" ? types : undefined,
          requirements: requirements.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.code) setErrorCode(result.code);
        throw new Error(
          friendlyGenerateError(result.error || "Generation failed", result.code),
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? friendlyGenerateError(caught.message)
          : "Generation failed",
      );
    } finally {
      setKindPending(kind, false);
    }
  }

  const busyKinds = useMemo(() => {
    const next = new Set(pendingKinds);
    for (const job of jobs) {
      if (job.deckId !== deckId || job.kind === "ingest") continue;
      if (job.status === "processing" || job.status === "pending") {
        next.add(job.kind);
      }
    }
    return next;
  }, [deckId, jobs, pendingKinds]);

  const documentButtons = useMemo(() => {
    if (!library) return [];
    const totals = new Map<string, number>();
    for (const doc of library.documents) {
      const key = `${doc.kind}:${doc.title.trim() || doc.kind}`;
      totals.set(key, (totals.get(key) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    return library.documents.map((doc) => {
      const key = `${doc.kind}:${doc.title.trim() || doc.kind}`;
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      const base =
        doc.title.trim() ||
        (doc.kind === "notes" ? t("notes") : doc.kind === "mindmap" ? t("mindmap") : t("exam"));
      return {
        ...doc,
        label: (totals.get(key) ?? 0) > 1 ? `${base} ${n}` : base,
      };
    });
  }, [library, t]);
  const openDoc = documentButtons.find((doc) => doc.id === openId) ?? null;

  function toggleOpen(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <section className="studio-panel space-y-6">
      {error ? (
        <p className="no-print rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}{" "}
          {errorCode === "GUEST_QUOTA" ? (
            <Link className="text-button" href="/account?upgrade=1">
              {t("guestCreateAccount")}
            </Link>
          ) : null}
        </p>
      ) : null}
      <div className="no-print">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-2 text-2xl font-black">{t("title")}</h2>
        <p className="page-subtitle mt-2">{library ? t("librarySubtitle") : t("subtitle")}</p>
      </div>
      {library ? (
        <div className="no-print flex flex-wrap gap-2">
          <button
            aria-pressed={openId === "source"}
            className="secondary-button"
            onClick={() => toggleOpen("source")}
            type="button"
          >
            {t("sourceButton")}
          </button>
          {documentButtons.map((doc) => (
            <button
              aria-pressed={openId === doc.id}
              className="secondary-button"
              key={doc.id}
              onClick={() => toggleOpen(doc.id)}
              type="button"
            >
              {doc.label}
            </button>
          ))}
          {library.cards.length ? (
            <button
              aria-pressed={openId === "cards"}
              className="secondary-button"
              onClick={() => toggleOpen("cards")}
              type="button"
            >
              {t("cards")}
            </button>
          ) : null}
        </div>
      ) : null}
      {!hasSource ? (
        <p className="no-print rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("noSource")}
        </p>
      ) : null}
      <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            className="studio-tile"
            disabled={!hasSource || busyKinds.has(tile.kind)}
            key={tile.kind}
            onClick={() => {
              if (library && tile.kind === "exam" && !examOpen) {
                setExamOpen(true);
                return;
              }
              if (library && tile.kind !== "exam") setExamOpen(false);
              void generate(tile.kind);
            }}
            type="button"
          >
            <p className="font-black">{tile.title}</p>
            <p className="mt-2 text-sm text-slate-600">
              {busyKinds.has(tile.kind)
                ? t("generating")
                : library && tile.kind === "exam" && !examOpen
                  ? t("examOptions")
                  : library && tile.kind === "notes"
                    ? t("generate")
                    : tile.ready
                      ? t("regenerate")
                      : t("generate")}
            </p>
          </button>
        ))}
      </div>

      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">
          {t("settings")}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            {t("depth")}
            <select
              className="field mt-1"
              onChange={(event) => setDepth(event.target.value as StudioDepth)}
              value={depth}
            >
              <option value="basic">{t("depthBasic")}</option>
              <option value="detailed">{t("depthDetailed")}</option>
            </select>
          </label>
          <label className="block text-sm">
            {t("purpose")}
            <select
              className="field mt-1"
              onChange={(event) => setPurpose(event.target.value as StudioPurpose)}
              value={purpose}
            >
              <option value="starter">{t("purposeStarter")}</option>
              <option value="exam">{t("purposeExam")}</option>
            </select>
          </label>
        </div>
        {library ? (
          <label className="mt-3 block text-sm">
            {t("requirements")}
            <textarea
              className="field mt-1 min-h-20"
              maxLength={500}
              onChange={(event) => setRequirements(event.target.value)}
              placeholder={t("requirementsHint")}
              value={requirements}
            />
          </label>
        ) : null}
        {library && !examOpen ? null : (
          <>
        <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-500">
          {t("examOptions")}
        </p>
        <label className="mt-3 block text-sm">
          {t("durationMinutes")}
          <input
            className="field mt-1"
            max={90}
            min={10}
            onChange={(event) =>
              setDurationMinutes(
                Math.min(90, Math.max(10, Number(event.target.value) || 30)),
              )
            }
            type="number"
            value={durationMinutes}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAM_QUESTION_TYPES.map((type) => (
            <label className="flex items-center gap-2 text-sm" key={type}>
              <input
                checked={types.includes(type)}
                onChange={(event) =>
                  setTypes((current) => {
                    if (event.target.checked) return [...current, type];
                    const next = current.filter((entry) => entry !== type);
                    return next.length ? next : current;
                  })
                }
                type="checkbox"
              />
              {t(`types.${type}`)}
            </label>
          ))}
        </div>
        {library && examOpen ? (
          <div className="mt-4">
            <ExamLaneChips deckId={deckId} examSystem={library.examSystem} />
          </div>
        ) : null}
          </>
        )}
      </div>

      {library && openId === "source" ? (
        <section>
          <p className="eyebrow">{t("sourceButton")}</p>
          <h2 className="mt-2 text-2xl font-black">{library.sourceHeading}</h2>
          {library.sourcePreview ? (
            <pre className="notebook-source-body">{library.sourcePreview}</pre>
          ) : (
            <p className="mt-3 text-sm text-slate-600">{t("noSource")}</p>
          )}
        </section>
      ) : null}
      {library && openDoc?.status === "failed" ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {openDoc.error || t("generating")}
        </p>
      ) : null}
      {library && openDoc?.status === "processing" ? (
        <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-950">{t("generating")}</p>
      ) : null}
      {library && openId === "cards" ? (
        <section className="space-y-4">
          <h2 className="text-xl font-black">{t("cards")}</h2>
          {library.cards.map((card, index) => (
            <form
              action={updateCardAction}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              key={card.id}
            >
              <input name="cardId" type="hidden" value={card.id} />
              <input name="deckId" type="hidden" value={deckId} />
              <p className="mb-4 text-xs font-black uppercase tracking-widest text-indigo-600">
                {t("cards")} {index + 1}
                {card.cardType && card.cardType !== "qa" ? ` · ${card.cardType}` : ""}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold">Front</span>
                  <textarea className="field min-h-28" defaultValue={card.front} name="front" required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold">Back</span>
                  <textarea className="field min-h-28" defaultValue={card.back} name="back" required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold">Hint</span>
                  <input className="field" defaultValue={card.hint ?? ""} name="hint" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold">Category</span>
                  <input className="field" defaultValue={card.category ?? ""} name="category" />
                </label>
              </div>
              <button className="secondary-button mt-4" type="submit">
                Save card
              </button>
            </form>
          ))}
        </section>
      ) : null}

      {(library ? openDoc?.mindmap?.nodes?.length : mindmap?.nodes?.length) ? (
        <MindmapTree
          deckId={deckId}
          editable={isV45FeaturesLive()}
          key={(library ? openDoc?.mindmap : mindmap)?.nodes.map((node) => node.id).join("-")}
          nodes={(library ? openDoc?.mindmap : mindmap)!.nodes}
          title={(library ? openDoc?.mindmap : mindmap)!.title}
        />
      ) : null}
      {(library ? openDoc?.notes?.markdown : notes?.markdown) ? (
        <StudyNotesView
          markdown={(library ? openDoc?.notes : notes)!.markdown}
          title={(library ? openDoc?.notes : notes)!.title ?? ""}
        />
      ) : null}
      {(library ? openDoc?.exam?.questions?.length : exam?.questions?.length) ? (
        <section className="no-print rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">{(library ? openDoc?.exam : exam)!.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {(library ? openDoc?.exam : exam)!.questions.length} {t("questions")}
          </p>
          <a className="primary-button mt-4 inline-flex" href={`/decks/${deckId}/exam`}>
            {t("takeExam")}
          </a>
        </section>
      ) : null}
    </section>
  );
}
