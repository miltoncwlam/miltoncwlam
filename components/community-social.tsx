"use client";

import { useTransition } from "react";

import {
  commentDeckAction,
  likeDeckAction,
  reportDeckAction,
  unlikeDeckAction,
} from "@/lib/actions/social";

export function CommunitySocial({
  deckId,
  likeCount,
  liked,
  comments,
}: {
  deckId: string;
  likeCount: number;
  liked: boolean;
  comments: Array<{ id: string; body: string; created_at: Date }>;
}) {
  const [pending, startTransition] = useTransition();

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
          {liked ? "Liked" : "Like"} · {likeCount}
        </button>
      </div>

      <form action={commentDeckAction} className="space-y-2">
        <input name="deckId" type="hidden" value={deckId} />
        <label className="block space-y-1">
          <span className="text-sm font-bold">Comment</span>
          <input
            className="field"
            maxLength={280}
            name="body"
            placeholder="Short note (optional)"
            required
          />
        </label>
        <button className="secondary-button" type="submit">
          Post comment
        </button>
      </form>

      {comments.length ? (
        <ul className="space-y-2 text-sm">
          {comments.map((comment) => (
            <li className="rounded-xl bg-slate-50 px-3 py-2" key={comment.id}>
              {comment.body}
            </li>
          ))}
        </ul>
      ) : null}

      <form action={reportDeckAction} className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-sm font-bold text-slate-900">Report deck</p>
        <input name="deckId" type="hidden" value={deckId} />
        <input
          className="field"
          name="reason"
          placeholder="Reason"
          required
        />
        <textarea
          className="field min-h-20"
          name="details"
          placeholder="Details (optional)"
        />
        <button className="text-button text-rose-700" type="submit">
          Submit report
        </button>
      </form>
    </section>
  );
}
