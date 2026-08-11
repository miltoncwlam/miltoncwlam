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
  const embedSnippet = token
    ? `<iframe src="${appUrl}/embed/${token}" title="Study A" width="100%" height="520" style="border:0;border-radius:16px;" loading="lazy" referrerpolicy="no-referrer"></iframe>`
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-bold text-slate-900">Read-only sharing</p>
      <p className="mt-1 text-sm text-slate-600">
        Anyone with the link can study. Only signed-in users save progress.
      </p>

      {shared ? (
        <p className="mt-3 text-sm font-bold text-emerald-700">Sharing on</p>
      ) : null}

      {link ? (
        <p className="mt-3 break-all rounded-lg bg-white p-3 text-xs text-indigo-700">
          {link} (copied)
        </p>
      ) : shared ? (
        <p className="mt-3 text-sm text-slate-600">
          A share link is already active. Rotate to copy a fresh URL.
        </p>
      ) : null}

      {embedSnippet ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold text-slate-900">Embed snippet</p>
          <textarea
            className="field min-h-24 font-mono text-xs"
            readOnly
            value={embedSnippet}
          />
          <p className="text-xs text-slate-500">
            Add <code>?mode=quiz</code> to the embed URL for quiz mode.
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
