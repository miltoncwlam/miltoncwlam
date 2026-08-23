"use client";

import { useState, useTransition } from "react";

import {
  disableSharingAction,
  enableSharingAction,
} from "@/lib/actions/sharing";

export function ShareControls({
  deckId,
  isShared,
  appUrl,
}: {
  deckId: string;
  isShared: boolean;
  appUrl: string;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [shared, setShared] = useState(isShared);
  const [pending, startTransition] = useTransition();

  const token = link?.split("/share/")[1] ?? null;
  const quizLink = token ? `${appUrl}/share/${token}?mode=quiz` : null;
  const embedSnippet = token
    ? `<iframe src="${appUrl}/embed/${token}" title="HK Study A" width="100%" height="520" style="border:0;border-radius:16px;" loading="lazy" referrerpolicy="no-referrer"></iframe>`
    : null;

  function createOrRotate() {
    startTransition(async () => {
      const nextLink = await enableSharingAction(deckId);
      setLink(nextLink);
      setShared(true);
      try {
        await navigator.clipboard.writeText(nextLink);
      } catch {
        // Clipboard may be unavailable in some browsers/tests.
      }
    });
  }

  function disable() {
    startTransition(async () => {
      await disableSharingAction(deckId);
      setShared(false);
      setLink(null);
    });
  }

  return (
    <div className="school-panel p-5">
      <p className="font-bold text-[var(--ink)]">Read-only sharing</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Anyone with the link can study. Only signed-in users save progress.
      </p>

      {shared ? (
        <p className="mt-3 text-sm font-bold text-[var(--accent-strong)]">Sharing on</p>
      ) : null}

      {link ? (
        <p className="mt-3 break-all rounded-lg bg-[var(--surface)] p-3 text-xs font-semibold text-[var(--accent-strong)]">
          {link} (copied)
        </p>
      ) : shared ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          A share link is already active. Rotate to copy a fresh URL.
        </p>
      ) : null}

      {quizLink ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold text-[var(--ink)]">Quiz link</p>
          <p className="break-all rounded-lg bg-[var(--surface)] p-3 text-xs font-semibold text-[var(--accent-strong)]">
            {quizLink}
          </p>
        </div>
      ) : null}

      {embedSnippet ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold text-[var(--ink)]">Embed snippet</p>
          <textarea
            className="field min-h-24 font-mono text-xs"
            readOnly
            value={embedSnippet}
          />
          <p className="text-xs text-[var(--muted)]">
            This embeds the study view. Add <code>?mode=quiz</code> to the URL to
            embed the quiz instead.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          className="secondary-button"
          disabled={pending}
          onClick={createOrRotate}
          type="button"
        >
          {shared ? "Rotate link" : "Enable & copy link"}
        </button>
        {shared ? (
          <button
            className="text-button text-rose-700"
            disabled={pending}
            onClick={disable}
            type="button"
          >
            Revoke
          </button>
        ) : null}
      </div>
    </div>
  );
}
