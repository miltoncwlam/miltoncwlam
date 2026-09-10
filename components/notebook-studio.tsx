"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { useGenerationJobs } from "@/components/generation-jobs";
import { MindmapTree } from "@/components/mindmap-tree";
import { StudyNotesView } from "@/components/study-notes-view";
import { friendlyGenerateError } from "@/lib/friendly-generate-error";
import { EXAM_QUESTION_TYPES, type ArtifactKind } from "@/lib/types/notebook";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";
import type { AppLocale, StudioDepth, StudioPurpose } from "@/lib/i18n/locales";

type StudioKind = ArtifactKind | "cards";

export function NotebookStudio({
  deckId,
  notes,
  mindmap,
  exam,
  hasSource,
  cardCount = 0,
}: {
  deckId: string;
  notes: NotesPayload | null;
  mindmap: MindmapPayload | null;
  exam: ExamPayload | null;
  hasSource: boolean;
  cardCount?: number;
}) {
  const t = useTranslations("studio");
  const locale = useLocale() as AppLocale;
  const { jobs } = useGenerationJobs();
  const [pendingKind, setPendingKind] = useState<StudioKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [types, setTypes] = useState<string[]>([...EXAM_QUESTION_TYPES]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [depth, setDepth] = useState<StudioDepth>("basic");
  const [purpose, setPurpose] = useState<StudioPurpose>("starter");

  const tiles = useMemo(
    () =>
      [
        { kind: "mindmap" as const, title: t("mindmap"), ready: Boolean(mindmap) },
        { kind: "notes" as const, title: t("notes"), ready: Boolean(notes) },
        { kind: "exam" as const, title: t("exam"), ready: Boolean(exam) },
        { kind: "cards" as const, title: t("cards"), ready: cardCount > 0 },
      ] as const,
    [cardCount, exam, mindmap, notes, t],
  );

  function generate(kind: StudioKind) {
    if (!hasSource) return;
    setError(null);
    setErrorCode(null);
    setPendingKind(kind);
    startTransition(async () => {
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
        setPendingKind(null);
      }
    });
  }

  const busyKind =
    pendingKind ||
    jobs.find(
      (job) =>
        job.deckId === deckId &&
        job.kind !== "ingest" &&
        job.status === "processing",
    )?.kind;

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
        <p className="page-subtitle mt-2">{t("subtitle")}</p>
      </div>
      {!hasSource ? (
        <p className="no-print rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("noSource")}
        </p>
      ) : null}
      <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            className="studio-tile"
            disabled={!hasSource || isPending || Boolean(busyKind)}
            key={tile.kind}
            onClick={() => generate(tile.kind)}
            type="button"
          >
            <p className="font-black">{tile.title}</p>
            <p className="mt-2 text-sm text-slate-600">
              {busyKind === tile.kind
                ? t("generating")
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
      </div>

      {mindmap ? (
        <MindmapTree
          key={mindmap.nodes.map((node) => node.id).join("-")}
          nodes={mindmap.nodes}
          title={mindmap.title}
        />
      ) : null}
      {notes ? <StudyNotesView markdown={notes.markdown} title={notes.title} /> : null}
      {exam ? (
        <section className="no-print rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">{exam.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {exam.questions.length} {t("questions")}
          </p>
          <a className="primary-button mt-4 inline-flex" href={`/decks/${deckId}/exam`}>
            {t("takeExam")}
          </a>
        </section>
      ) : null}
    </section>
  );
}
