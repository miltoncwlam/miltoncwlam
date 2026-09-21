"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { removeWrongItemAction } from "@/lib/actions/wrong-questions";
import {
  WrongItemDrill,
  formatAnswer,
} from "@/components/wrong-item-drill";
import type { WrongQuestionItem } from "@/lib/types/notebook";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dueItems = useMemo(
    () => items.filter((item) => item.isDue),
    [items],
  );
  const current = queue[0] ?? null;

  function startDrill() {
    setQueue(dueItems);
    setError(null);
    setDrilling(true);
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
        <WrongItemDrill
          deckId={deckId}
          item={current}
          key={current.id}
          onError={setError}
          onRated={() => {
            setQueue((currentQueue) => currentQueue.slice(1));
            setError(null);
          }}
        />
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
                    date: item.dueAt.toISOString().slice(0, 10),
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
