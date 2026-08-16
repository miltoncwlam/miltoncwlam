"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  disableSharingAction,
  enableSharingAction,
} from "@/lib/actions/sharing";
import { PLAY_TEMPLATES } from "@/lib/play/templates";

export function ShareControls({
  deckId,
  isShared,
  appUrl,
}: {
  deckId: string;
  isShared: boolean;
  appUrl: string;
}) {
  const t = useTranslations("play");
  const [link, setLink] = useState<string | null>(null);
  const [shared, setShared] = useState(isShared);
  const [pending, startTransition] = useTransition();

  const [activity, setActivity] = useState("matching-pairs");
  const token = link?.split("/share/")[1] ?? null;
  const activityLink = token
    ? `${appUrl}/share/${token}?activity=${activity}`
    : null;
  const embedSnippet = token
    ? `<iframe src="${appUrl}/embed/${token}?mode=${activity}" title="HK Study A" width="100%" height="520" style="border:0;border-radius:16px;" loading="lazy" referrerpolicy="no-referrer"></iframe>`
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

      {activityLink ? (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-bold text-slate-900">
            Assign one activity
            <select
              className="field mt-1"
              onChange={(event) => setActivity(event.target.value)}
              value={activity}
            >
              {PLAY_TEMPLATES.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(`templates.${item.id}.name`)}
                </option>
              ))}
            </select>
          </label>
          <p className="break-all rounded-lg bg-white p-3 text-xs text-indigo-700">
            {activityLink}
          </p>
          <p className="break-all rounded-lg bg-white p-3 text-xs text-indigo-700">
            {appUrl}/share/{token}?mode=quiz
          </p>
        </div>
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
            Share <code>?mode=quiz</code> for quiz battle. Embed the same with{" "}
            <code>?mode=quiz</code>, or <code>?mode=matching-pairs</code> (or any
            activity id) for a classroom template.
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
