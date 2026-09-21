"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { FlashCard } from "@/components/flash-card";
import { WrongItemDrill } from "@/components/wrong-item-drill";
import { rateCardSrsAction } from "@/lib/actions/study";
import type { ReviewQueueItem } from "@/lib/study/review-queue";
import type { CardRating } from "@/lib/types/flashcard";

export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  const t = useTranslations("review");
  const ts = useTranslations("study");
  const router = useRouter();
  const [queue, setQueue] = useState(items);
  const [flipped, setFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const current = queue[0] ?? null;

  function advance() {
    setQueue((currentQueue) => currentQueue.slice(1));
    setFlipped(false);
    setSelectedOption(null);
    setError(null);
  }

  function rateCard(rating: CardRating) {
    if (!current || current.kind !== "card") return;
    startTransition(async () => {
      try {
        await rateCardSrsAction({ cardId: current.card.id, rating });
        advance();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t("saveFailed"));
      }
    });
  }

  if (!current) {
    return (
      <section className="play-finish mx-auto max-w-lg">
        <p className="eyebrow">{t("done")}</p>
        <h2 className="page-title mt-2">{t("caughtUp")}</h2>
        <p className="page-subtitle">{t("caughtUpBody")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link className="secondary-button" href="/decks">
            {t("backToLibrary")}
          </Link>
          <button
            className="text-button"
            onClick={() => router.refresh()}
            type="button"
          >
            {t("refresh")}
          </button>
        </div>
      </section>
    );
  }

  const isMcq =
    current.kind === "card" &&
    current.card.cardType === "mcq" &&
    Boolean(current.card.options?.length);
  const mcqReady = !isMcq || selectedOption != null;

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
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {current.kind === "card" ? t("cardFrom") : t("wrongFrom")}{" "}
        <Link className="text-button" href={`/decks/${current.deckId}`}>
          {current.deckTitle}
        </Link>
      </p>
      {current.kind === "card" ? (
        <>
          <FlashCard
            back={current.card.back}
            cardType={current.card.cardType}
            category={current.card.category}
            flipped={flipped}
            front={current.card.front}
            hint={current.card.hint}
            imageUrl={current.card.imageUrl}
            imageAttribution={current.card.imageAttribution}
            index={1}
            onFlip={() => {
              if (isMcq && !selectedOption) return;
              setFlipped((value) => !value);
            }}
            onSelectOption={(option) => {
              setSelectedOption(option);
              setFlipped(true);
            }}
            options={current.card.options}
            selectedOption={selectedOption}
            total={queue.length}
          />
          <div className="grid grid-cols-3 gap-3">
            {(["hard", "ok", "easy"] as const).map((rating) => (
              <button
                className={`rating-button rating-${rating}`}
                disabled={isPending || !flipped || !mcqReady}
                key={rating}
                onClick={() => rateCard(rating)}
                type="button"
              >
                {rating === "hard"
                  ? ts("hard")
                  : rating === "easy"
                    ? ts("easy")
                    : ts("ok")}
              </button>
            ))}
          </div>
        </>
      ) : (
        <WrongItemDrill
          deckId={current.deckId}
          item={current.item}
          key={current.item.id}
          onError={setError}
          onRated={advance}
        />
      )}
    </section>
  );
}
