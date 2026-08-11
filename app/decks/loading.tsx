export default function LoadingDecks() {
  return (
    <main className="page-shell" aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-12 w-72 animate-pulse rounded bg-slate-200" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-52 animate-pulse rounded-3xl bg-slate-200" key={item} />
        ))}
      </div>
    </main>
  );
}
