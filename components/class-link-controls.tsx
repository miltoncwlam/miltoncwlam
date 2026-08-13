"use client";

import { useState, useTransition } from "react";

import {
  createClassLinkAction,
  revokeClassLinkAction,
} from "@/lib/actions/class-links";
import { PLAY_TEMPLATES } from "@/lib/play/templates";

export function ClassLinkControls({
  deckId,
  links,
}: {
  deckId: string;
  links: Array<{
    id: string;
    join_count: number;
    created_at: Date;
    revoked_at: Date | null;
  }>;
}) {
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [activity, setActivity] = useState("");

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="font-bold text-slate-900">Class mode</p>
      <p className="mt-1 text-sm text-slate-600">
        Students open the link and get a copy of this deck in their library.
        Optionally assign one activity.
      </p>
      <label className="mt-3 block text-sm">
        <span className="font-semibold">Assigned activity</span>
        <select
          className="field mt-1"
          onChange={(event) => setActivity(event.target.value)}
          value={activity}
        >
          <option value="">Copy deck only</option>
          {PLAY_TEMPLATES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {freshLink ? (
        <p className="mt-3 break-all rounded-lg bg-white p-3 text-xs text-indigo-700">
          {freshLink}
        </p>
      ) : null}

      <button
        className="secondary-button mt-4"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const link = await createClassLinkAction(deckId, activity || undefined);
            setFreshLink(link);
            try {
              await navigator.clipboard.writeText(link);
            } catch {
              // ignore
            }
          })
        }
        type="button"
      >
        Create class link
      </button>

      {links.length ? (
        <ul className="mt-4 space-y-2 text-sm">
          {links.map((link) => (
            <li
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
              key={link.id}
            >
              <span>
                {link.join_count} joins
                {link.revoked_at ? " · revoked" : ""}
              </span>
              {!link.revoked_at ? (
                <form action={revokeClassLinkAction}>
                  <input name="linkId" type="hidden" value={link.id} />
                  <input name="deckId" type="hidden" value={deckId} />
                  <button className="text-button text-rose-700" type="submit">
                    Revoke
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
