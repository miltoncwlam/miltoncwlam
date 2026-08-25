"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  setPrivateAction,
  setUnlistedAction,
  submitPublicAction,
} from "@/lib/actions/community";
import { withBrowserOrigin } from "@/lib/app-url";
import { appealRejectedPublishAction } from "@/lib/actions/social";
import type { DeckVisibility, ModerationStatus } from "@/lib/types/flashcard";

export function CommunityVisibilityControls({
  deckId,
  visibility,
  moderationStatus,
  moderationReasons,
}: {
  deckId: string;
  visibility: DeckVisibility;
  moderationStatus: ModerationStatus;
  moderationReasons?: string | null;
}) {
  const t = useTranslations("community");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
        {t("visibility")}
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        {visibility === "public"
          ? t("public")
          : visibility === "unlisted"
            ? t("unlisted")
            : t("private")}
        {moderationStatus === "rejected" ? ` · ${t("rejected")}` : null}
        {moderationStatus === "approved" && visibility === "public"
          ? ` · ${t("approved")}`
          : null}
      </p>
      {moderationReasons && moderationStatus === "rejected" ? (
        <div className="mt-2 space-y-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <p>{moderationReasons}</p>
          <form action={appealRejectedPublishAction} className="space-y-2">
            <input name="deckId" type="hidden" value={deckId} />
            <textarea
              className="field min-h-20 text-slate-900"
              name="appealNote"
              placeholder="Appeal note for admins"
              required
            />
            <button className="secondary-button" type="submit">
              Send appeal
            </button>
          </form>
        </div>
      ) : null}
      {shareUrl ? (
        <p className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          {shareUrl}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-sm text-slate-700">{message}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="secondary-button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const url = withBrowserOrigin(
                await setUnlistedAction(deckId),
                window.location.origin,
              );
              setShareUrl(url);
              setMessage(t("unlisted"));
            })
          }
          type="button"
        >
          {t("makeUnlisted")}
        </button>
        <button
          className="primary-button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setMessage(t("submitting"));
              const result = await submitPublicAction(deckId);
              if (result.ok) {
                setShareUrl(
                  withBrowserOrigin(result.shareUrl, window.location.origin),
                );
                setMessage(t("approved"));
              } else {
                setMessage(
                  `${t("rejected")}: ${result.reasons.join(" ") || "Try improving the cards."}`,
                );
              }
            })
          }
          type="button"
        >
          {t("submitPublic")}
        </button>
        <button
          className="text-button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setPrivateAction(deckId);
              setShareUrl(null);
              setMessage(t("private"));
            })
          }
          type="button"
        >
          {t("makePrivate")}
        </button>
      </div>
    </section>
  );
}
