"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
