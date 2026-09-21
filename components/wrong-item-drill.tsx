"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { rateWrongItemAction } from "@/lib/actions/wrong-questions";
import { normalizeTrueFalse } from "@/lib/exam/true-false";
import { autoCheckWrongItem } from "@/lib/study/wrong-questions";
import type { CardRating } from "@/lib/types/flashcard";
import type {
  ExamQuestion,
  ExamStudentAnswer,
  WrongQuestionItem,
} from "@/lib/types/notebook";

export function choiceLabel(choice: string, t: (key: "true" | "false") => string) {
  const flag = normalizeTrueFalse(choice);
  if (flag === "true") return t("true");
  if (flag === "false") return t("false");
  return choice;
}

export function formatAnswer(value: ExamStudentAnswer | null | undefined) {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  const rows = Object.entries(value).filter(([, right]) => right);
  if (!rows.length) return "—";
  return rows.map(([left, right]) => `${left} → ${right}`).join("; ");
}

export function AnswerField({
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

export function WrongItemDrill({
  item,
  deckId,
  onRated,
  onError,
}: {
  item: WrongQuestionItem;
  deckId: string;
  onRated: () => void;
  onError: (message: string) => void;
}) {
  const t = useTranslations("mistakes");
  const te = useTranslations("exam");
  const [answer, setAnswer] = useState<ExamStudentAnswer | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const [autoResult, setAutoResult] = useState<{
    rating: CardRating;
    marksAwarded: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitRating(rating: CardRating) {
    startTransition(async () => {
      try {
        await rateWrongItemAction({ itemId: item.id, deckId, rating });
        onRated();
      } catch (caught) {
        onError(caught instanceof Error ? caught.message : t("saveFailed"));
      }
    });
  }

  function checkAnswer() {
    const auto = autoCheckWrongItem(item.question, answer);
    if (auto) setAutoResult(auto);
    setRevealed(true);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {te(`types.${item.question.type}`)} · {item.marks} {te("marks")}
      </p>
      <p className="mt-2 font-semibold">{item.question.prompt}</p>
      {item.question.choices?.length &&
      ["mcq", "tf", "cloze_choice"].includes(item.question.type) ? (
        <ol className="mt-3 list-none space-y-1 text-sm text-slate-600">
          {item.question.choices.map((choice, index) => (
            <li key={choice}>
              {String.fromCharCode(65 + index)}. {choiceLabel(choice, te)}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="mt-4">
        <AnswerField
          onChange={setAnswer}
          question={item.question}
          value={answer}
        />
      </div>
      <p className="mt-4 text-sm text-slate-600">
        <span className="font-semibold">{t("youWrote")}: </span>
        {formatAnswer(item.yourAnswer)}
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
              {autoResult.rating === "ok" ? t("autoCorrect") : t("autoWrong")}
            </p>
          ) : null}
          <p>
            <span className="font-semibold">{t("markScheme")}: </span>
            {item.question.markScheme || item.question.answer}
          </p>
          {item.feedback ? (
            <p className="mt-2">
              <span className="font-semibold">{t("markerSaid")}: </span>
              {item.feedback}
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
  );
}
