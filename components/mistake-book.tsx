"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  rateWrongItemAction,
  removeWrongItemAction,
} from "@/lib/actions/wrong-questions";
import { normalizeTrueFalse } from "@/lib/exam/true-false";
import { autoCheckWrongItem } from "@/lib/study/wrong-questions";
import type { CardRating } from "@/lib/types/flashcard";
import type {
  ExamQuestion,
  ExamStudentAnswer,
  WrongQuestionItem,
} from "@/lib/types/notebook";

function choiceLabel(choice: string, t: (key: "true" | "false") => string) {
  const flag = normalizeTrueFalse(choice);
  if (flag === "true") return t("true");
  if (flag === "false") return t("false");
  return choice;
}

function formatAnswer(value: ExamStudentAnswer | null | undefined) {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  const rows = Object.entries(value).filter(([, right]) => right);
  if (!rows.length) return "—";
  return rows.map(([left, right]) => `${left} → ${right}`).join("; ");
}

function AnswerField({
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
    () => (question.pairs ?? []).map((pair) => pair.right),
    [question.pairs],
  );

  if (
    question.type === "tf" ||
    question.type === "mcq" ||
    question.type === "cloze_choice"
  ) {
    const choices =
      question.choices?.length
        ? question.choices
        : question.type === "tf"
          ? ["True", "False"]
          : [];
    return (
      <div className="space-y-2">
        {choices.map((choice, index) => (
          <label
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"
            key={choice}
          >
            <input
              checked={text === choice}
              name={`mistake-${question.id}`}
              onChange={() => onChange(choice)}
              type="radio"
            />
            <span className="font-black text-slate-500">
              {String.fromCharCode(65 + index)}.
            </span>
            {choiceLabel(choice, t)}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "matching") {
    return (
      <div className="space-y-2">
        {(question.pairs ?? []).map((pair) => (
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
        className="field min-h-28"
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

export function MistakeBook({
  deckId,
  items,
}: {
  deckId: string;
  items: WrongQuestionItem[];
}) {
  const t = useTranslations("mistakes");
  const te = useTranslations("exam");
  const router = useRouter();
  const [drilling, setDrilling] = useState(false);
  const [queue, setQueue] = useState<WrongQuestionItem[]>([]);
  const [answer, setAnswer] = useState<ExamStudentAnswer | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [autoResult, setAutoResult] = useState<{
    rating: CardRating;
    marksAwarded: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dueItems = useMemo(
    () => items.filter((item) => item.isDue),
    [items],
  );
  const current = queue[0] ?? null;

  function startDrill() {
    setQueue(dueItems);
    setAnswer(undefined);
    setRevealed(false);
    setAutoResult(null);
    setError(null);
    setDrilling(true);
  }

  function advanceQueue() {
    setQueue((currentQueue) => currentQueue.slice(1));
    setAnswer(undefined);
    setRevealed(false);
    setAutoResult(null);
    setError(null);
  }

  function submitRating(rating: CardRating) {
    if (!current) return;
    startTransition(async () => {
      try {
        await rateWrongItemAction({ itemId: current.id, deckId, rating });
        advanceQueue();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("saveFailed"));
      }
    });
  }

  function checkAnswer() {
    if (!current) return;
    const auto = autoCheckWrongItem(current.question, answer);
    if (auto) {
      setAutoResult(auto);
    }
    setRevealed(true);
  }

  function removeItem(itemId: string) {
    startTransition(async () => {
      try {
        await removeWrongItemAction({ itemId, deckId });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("saveFailed"));
      }
    });
  }

  if (drilling) {
    if (!current) {
      return (
        <section className="play-finish mx-auto max-w-lg">
          <p className="eyebrow">{t("done")}</p>
          <h2 className="page-title mt-2">{t("doneTitle")}</h2>
          <p className="page-subtitle">{t("doneSubtitle")}</p>
          <div className="mt-8 flex justify-center gap-3">
            <button
              className="secondary-button"
              onClick={() => {
                setDrilling(false);
                router.refresh();
              }}
              type="button"
            >
              {t("backToList")}
            </button>
          </div>
        </section>
      );
    }
    return (
      <section className="space-y-6">
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">
          {t("progress", { left: queue.length })}
        </p>
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            {te(`types.${current.question.type}`)} · {current.marks} {te("marks")}
          </p>
          <p className="mt-2 font-semibold">{current.question.prompt}</p>
          {current.question.choices?.length &&
          ["mcq", "tf", "cloze_choice"].includes(current.question.type) ? (
            <ol className="mt-3 list-none space-y-1 text-sm text-slate-600">
              {current.question.choices.map((choice, index) => (
                <li key={choice}>
                  {String.fromCharCode(65 + index)}. {choiceLabel(choice, te)}
                </li>
              ))}
            </ol>
          ) : null}
          <div className="mt-4">
            <AnswerField
              onChange={setAnswer}
              question={current.question}
              value={answer}
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            <span className="font-semibold">{t("youWrote")}: </span>
            {formatAnswer(current.yourAnswer)}
          </p>
          {revealed ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
              {autoResult ? (
                <p
                  className={`mb-2 font-black ${
                    autoResult.rating === "ok"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {autoResult.rating === "ok"
                    ? t("autoCorrect")
                    : t("autoWrong")}
                </p>
              ) : null}
              <p>
                <span className="font-semibold">{t("markScheme")}: </span>
                {current.question.markScheme || current.question.answer}
              </p>
              {current.feedback ? (
                <p className="mt-2">
                  <span className="font-semibold">{t("markerSaid")}: </span>
                  {current.feedback}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {!revealed ? (
              <button
                className="primary-button"
                disabled={isPending}
                onClick={checkAnswer}
                type="button"
              >
                {isPending ? t("checking") : t("check")}
              </button>
            ) : autoResult ? (
              <button
                className="primary-button"
                disabled={isPending}
                onClick={() => submitRating(autoResult.rating)}
                type="button"
              >
                {t("next")}
              </button>
            ) : (
              <>
                <span className="w-full text-sm font-bold text-slate-600">
                  {t("selfRate")}
                </span>
                {(["hard", "ok", "easy"] as const).map((rating) => (
                  <button
                    className={
                      rating === "easy" ? "primary-button" : "secondary-button"
                    }
                    disabled={isPending}
                    key={rating}
                    onClick={() => submitRating(rating)}
                    type="button"
                  >
                    {t(`ratings.${rating}`)}
                  </button>
                ))}
              </>
            )}
          </div>
        </article>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
        <p>{t("emptyHint")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}
      <div className="no-print flex flex-wrap gap-3">
        <button
          className="primary-button"
          disabled={!dueItems.length || isPending}
          onClick={startDrill}
          type="button"
        >
          {t("drillDue", { count: dueItems.length })}
        </button>
      </div>
      {items.map((item) => {
        const due = item.isDue;
        return (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-5"
            key={item.id}
          >
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              {te(`types.${item.question.type}`)} · {item.marksAwarded}/
              {item.marks} {te("marks")} ·{" "}
              {due
                ? t("dueNow")
                : t("dueOn", {
                    date: item.dueAt.toLocaleDateString(),
                  })}
              {item.repetitions
                ? ` · ${t("drilled", { count: item.repetitions })}`
                : ""}
            </p>
            <p className="mt-2 font-semibold">{item.question.prompt}</p>
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-semibold">{t("youWrote")}: </span>
              {formatAnswer(item.yourAnswer)}
            </p>
            {item.feedback ? (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold">{t("markerSaid")}: </span>
                {item.feedback}
              </p>
            ) : null}
            <div className="no-print mt-4">
              <button
                className="text-button"
                disabled={isPending}
                onClick={() => removeItem(item.id)}
                type="button"
              >
                {t("remove")}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
