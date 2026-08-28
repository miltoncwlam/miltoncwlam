"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { MindmapTree } from "@/components/mindmap-tree";
import { StudyNotesView } from "@/components/study-notes-view";
import { EXAM_QUESTION_TYPES, type ArtifactKind } from "@/lib/types/notebook";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";
import type { AppLocale } from "@/lib/i18n/locales";

export function NotebookStudio({
  deckId,
  notes,
  mindmap,
  exam,
  hasSource,
}: {
  deckId: string;
  notes: NotesPayload | null;
  mindmap: MindmapPayload | null;
  exam: ExamPayload | null;
  hasSource: boolean;
}) {
  const t = useTranslations("studio");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pendingKind, setPendingKind] = useState<ArtifactKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [types, setTypes] = useState<string[]>([...EXAM_QUESTION_TYPES]);
  const [questionCount, setQuestionCount] = useState(12);
  const [difficulty, setDifficulty] = useState("intermediate");

  const tiles = useMemo(
    () =>
      [
        { kind: "mindmap" as const, title: t("mindmap"), ready: Boolean(mindmap) },
        { kind: "notes" as const, title: t("notes"), ready: Boolean(notes) },
        { kind: "exam" as const, title: t("exam"), ready: Boolean(exam) },
      ] as const,
    [exam, mindmap, notes, t],
  );

  function generate(kind: ArtifactKind) {
    if (!hasSource) return;
    setError(null);
    setPendingKind(kind);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}/artifacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            language: locale,
            difficulty,
            questionCount,
            types: kind === "exam" ? types : undefined,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Generation failed");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Generation failed");
      } finally {
        setPendingKind(null);
      }
    });
  }

  return (
    <section className="studio-panel space-y-6">
      <div>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-2 text-2xl font-black">{t("title")}</h2>
        <p className="page-subtitle mt-2">{t("subtitle")}</p>
      </div>
      {!hasSource ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("noSource")}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <button
            className="studio-tile"
            disabled={!hasSource || isPending}
            key={tile.kind}
            onClick={() => generate(tile.kind)}
            type="button"
          >
            <p className="font-black">{tile.title}</p>
            <p className="mt-2 text-sm text-slate-600">
              {pendingKind === tile.kind
                ? t("generating")
                : tile.ready
                  ? t("regenerate")
                  : t("generate")}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">
          {t("examOptions")}
        </p>
        <label className="mt-3 block text-sm">
          {t("questionCount")}
          <input
            className="field mt-1"
            max={24}
            min={4}
            onChange={(event) => setQuestionCount(Number(event.target.value) || 12)}
            type="number"
            value={questionCount}
          />
        </label>
        <label className="mt-3 block text-sm">
          {t("difficulty")}
          <select
            className="field mt-1"
            onChange={(event) => setDifficulty(event.target.value)}
            value={difficulty}
          >
            <option value="beginner">{t("beginner")}</option>
            <option value="intermediate">{t("intermediate")}</option>
            <option value="advanced">{t("advanced")}</option>
          </select>
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

      {mindmap ? <MindmapTree nodes={mindmap.nodes} title={mindmap.title} /> : null}
      {notes ? <StudyNotesView markdown={notes.markdown} title={notes.title} /> : null}
      {exam ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
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
