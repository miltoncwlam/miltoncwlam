"use client";

export default function DecksError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page-shell">
      <section className="empty-state">
        <h1 className="text-2xl font-black">Something went wrong</h1>
        <p className="mt-2 text-slate-600">We could not load this part of your library.</p>
        <button className="primary-button mt-6" onClick={reset} type="button">Try again</button>
      </section>
    </main>
  );
}
