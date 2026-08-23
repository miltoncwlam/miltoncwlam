"use client";

import { useState, useTransition } from "react";

import {
  createClassLinkAction,
  revokeClassLinkAction,
} from "@/lib/actions/class-links";

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

  return (
    <div className="school-panel p-5">
      <p className="font-bold text-[var(--ink)]">Class mode</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Students open the link and get a copy of this deck in their library.
      </p>

      {freshLink ? (
        <p className="mt-3 break-all rounded-lg bg-[var(--surface)] p-3 text-xs font-semibold text-[var(--accent-strong)]">
          {freshLink}
        </p>
      ) : null}

      <button
        className="secondary-button mt-4"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const link = await createClassLinkAction(deckId);
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
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
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
