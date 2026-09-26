"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  commentDeckAction,
  likeDeckAction,
  rateDeckAction,
  reportDeckAction,
  unlikeDeckAction,
} from "@/lib/actions/social";

export function CommunitySocial({
  deckId,
  likeCount,
  liked,
  ratingAvg,
  ratingCount,
  userRating,
  comments,
  showRatings = false,
}: {
  deckId: string;
  likeCount: number;
  liked: boolean;
  ratingAvg: number;
  ratingCount: number;
  userRating: number | null;
  showRatings?: boolean;
  comments: Array<{
    id: string;
    body: string;
    created_at: Date;
    authorName?: string;
  }>;
}) {
  const t = useTranslations("community");
  const [pending, startTransition] = useTransition();
  const filled = userRating ?? 0;

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="secondary-button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (liked) await unlikeDeckAction(deckId);
              else await likeDeckAction(deckId);
            })
          }
          type="button"
        >
          {liked ? t("liked") : t("like")} · {likeCount}
        </button>
        {showRatings ? (
          <div className="flex items-center gap-1" role="group" aria-label={t("rate")}>
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                aria-label={t("starsAria", { stars })}
                aria-pressed={userRating === stars}
                className={`text-2xl leading-none ${
                  stars <= filled ? "text-amber-500" : "text-slate-300"
                }`}
                disabled={pending}
                key={stars}
                onClick={() =>
                  startTransition(async () => {
                    await rateDeckAction({ deckId, stars });
                  })
                }
                type="button"
              >
                ★
              </button>
            ))}
            {ratingCount ? (
              <span className="ml-1 text-sm text-[var(--muted)]">
                {t("rating", {
                  avg: ratingAvg.toFixed(1),
                  count: ratingCount,
                })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <form action={commentDeckAction} className="space-y-2">
        <input name="deckId" type="hidden" value={deckId} />
        <label className="block space-y-1">
          <span className="text-sm font-bold">{t("comment")}</span>
          <input
            className="field"
            maxLength={280}
            name="body"
            placeholder={t("commentPlaceholder")}
            required
          />
        </label>
        <button className="secondary-button" type="submit">
          {t("postComment")}
        </button>
      </form>

      {comments.length ? (
        <ul className="space-y-2 text-sm">
          {comments.map((comment) => (
            <li className="rounded-xl bg-slate-50 px-3 py-2" key={comment.id}>
              {comment.authorName ? (
                <p className="text-xs font-bold text-[var(--muted)]">
                  {t("commentBy", { name: comment.authorName })}
                </p>
              ) : null}
              {comment.body}
            </li>
          ))}
        </ul>
      ) : null}

      <form action={reportDeckAction} className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-sm font-bold text-slate-900">{t("reportDeck")}</p>
        <input name="deckId" type="hidden" value={deckId} />
        <input
          className="field"
          name="reason"
          placeholder={t("reportReason")}
          required
        />
        <textarea
          className="field min-h-20"
          name="details"
          placeholder={t("reportDetails")}
        />
        <button className="text-button text-rose-700" type="submit">
          {t("submitReport")}
        </button>
      </form>
    </section>
  );
}
