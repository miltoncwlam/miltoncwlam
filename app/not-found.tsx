import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="empty-state">
        <h1 className="text-2xl font-black">Page not found</h1>
        <p className="mt-2 text-slate-600">
          That link does not match any page in HK Study A.
        </p>
        <Link className="primary-button mt-6 inline-block" href="/">
          Back home
        </Link>
      </section>
    </main>
  );
}
