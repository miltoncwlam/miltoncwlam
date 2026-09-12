"use client";

import { useEffect } from "react";
import Link from "next/link";

import { reportBetaEvent } from "@/lib/beta-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportBetaEvent({
      kind: "error",
      message: error.message || "Something went wrong",
      details: { source: "app/error", digest: error.digest, stack: error.stack },
    }).catch(() => {});
  }, [error]);

  return (
    <main className="page-shell">
      <section className="empty-state">
        <h1 className="text-2xl font-black">Something went wrong</h1>
        <p className="mt-2 text-slate-600">
          An unexpected error occurred. You can try again or return home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="primary-button" onClick={reset} type="button">
            Try again
          </button>
          <Link className="secondary-button" href="/">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
