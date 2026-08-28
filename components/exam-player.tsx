"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type {
  ExamAnswers,
  ExamPayload,
  ExamQuestion,
  ExamQuestionResult,
  ExamStudentAnswer,
} from "@/lib/types/notebook";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: ExamQuestion;
  value: ExamStudentAnswer | undefined;
  onChange: (value: ExamStudentAnswer) => void;
}) {
  const t = useTranslations("exam");
  const text = typeof value === "string" ? value : "";
  const matching = value && typeof value === "object" ? value : {};
  const rights = useMemo(
    () => shuffle((question.pairs ?? []).map((pair) => pair.right)),
    [question.pairs],
  );

  if (question.type === "tf" || question.type === "mcq" || question.type === "cloze_choice") {
    const choices =
      question.choices?.length
        ? question.choices
        : question.type === "tf"
          ? ["True", "False"]
          : [];
    return (
      <div className="space-y-2">
        {choices.map((choice) => (
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2" key={choice}>
            <input
              checked={text === choice}
              name={question.id}
              onChange={() => onChange(choice)}
              type="radio"
            />
            {choice}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "matching" && question.pairs?.length) {
    return (
      <div className="space-y-2">
        {question.pairs.map((pair) => (
          <label className="grid gap-2 sm:grid-cols-2" key={pair.left}>
            <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold">
              {pair.left}
            </span>
            <select
              className="field"
              onChange={(event) =>
                onChange({ ...matching, [pair.left]: event.target.value })
              }
              value={matching[pair.left] ?? ""}
            >
              <option value="">{t("choose")}</option>
              {rights.map((right) => (
                <option key={right} value={right}>
                  {right}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "long") {
    return (
      <textarea
        className="field min-h-32"
        onChange={(event) => onChange(event.target.value)}
        value={text}
      />
    );
  }

  return (
    <input
      className="field"
      onChange={(event) => onChange(event.target.value)}
      value={text}
    />
  );
}

export function ExamPlayer({
  deckId,
  exam,
}: {
  deckId: string;
  exam: ExamPayload;
}) {
  const t = useTranslations("exam");
  const router = useRouter();
  const [answers, setAnswers] = useState<ExamAnswers>({});
  const [result, setResult] = useState<ExamQuestionResult[] | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setAnswer(id: string, value: ExamStudentAnswer) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/decks/${deckId}/exam/grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Grading failed");
        setResult(payload.result);
        setScore(payload.score);
        setMaxScore(payload.maxScore);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Grading failed");
      }
    });
  }

  if (result) {
    const byId = new Map(result.map((item) => [item.id, item]));
    return (
      <section className="space-y-6">
        <section className="play-finish mx-auto max-w-lg">
          <p className="eyebrow">{t("marked")}</p>
          <h2 className="page-title mt-2">
            {score}/{maxScore}
          </h2>
          <p className="page-subtitle">
            {maxScore ? Math.round((score / maxScore) * 100) : 0}%
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button
              className="secondary-button"
              onClick={() => router.push(`/decks/${deckId}`)}
              type="button"
            >
              {t("back")}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              type="button"
            >
              {t("tryAgain")}
            </button>
          </div>
        </section>
        {exam.questions.map((question, index) => {
          const item = byId.get(question.id);
          return (
            <article
              className={`rounded-2xl border p-5 ${
                item?.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
              }`}
              key={question.id}
            >
              <p className="text-xs font-black uppercase tracking-widest">
                {index + 1}. {t(`types.${question.type}`)} · {item?.marksAwarded ?? 0}/
                {question.marks}
              </p>
              <p className="mt-2 font-semibold">{question.prompt}</p>
              {item?.feedback ? <p className="mt-2 text-sm">{item.feedback}</p> : null}
            </article>
          );
        })}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {exam.instructions ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm">{exam.instructions}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
      ) : null}
      {exam.questions.map((question, index) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5" key={question.id}>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            {index + 1}. {t(`types.${question.type}`)} · {question.marks} {t("marks")}
          </p>
          <p className="mt-2 font-semibold">{question.prompt}</p>
          <div className="mt-3">
            <QuestionField
              onChange={(value) => setAnswer(question.id, value)}
              question={question}
              value={answers[question.id]}
            />
          </div>
        </article>
      ))}
      <button className="primary-button" disabled={isPending} onClick={submit} type="button">
        {isPending ? t("marking") : t("submit")}
      </button>
    </section>
  );
}
