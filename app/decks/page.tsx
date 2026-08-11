import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { DeckCard } from "@/components/deck-card";
import { createSampleDeckAction } from "@/lib/actions/decks";
import { requireSession } from "@/lib/auth-server";
import { listDeckFolders, listDecks } from "@/lib/data/decks";
import type { LibraryFilter, LibrarySort } from "@/lib/types/flashcard";

const FILTERS: { id: LibraryFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "incomplete", label: "Incomplete" },
  { id: "public", label: "Public" },
  { id: "quiz-ready", label: "Quiz-ready" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

const SORTS: { id: LibrarySort; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "title", label: "Title" },
  { id: "cards", label: "Most cards" },
];

function asFilter(value: string | undefined): LibraryFilter {
  const allowed = FILTERS.map((entry) => entry.id);
  return allowed.includes(value as LibraryFilter)
    ? (value as LibraryFilter)
    : "active";
}

function asSort(value: string | undefined): LibrarySort {
  const allowed = SORTS.map((entry) => entry.id);
  return allowed.includes(value as LibrarySort)
    ? (value as LibrarySort)
    : "recent";
}

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; folder?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const filter = asFilter(params.filter);
  const sort = asSort(params.sort);
  const folder = params.folder?.trim() || undefined;
  const [decks, folders] = await Promise.all([
    listDecks(session.user.id, { filter, sort, folder }),
    listDeckFolders(session.user.id),
  ]);
  const t = await getTranslations("decks");

  return (
    <main className="page-shell">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("subtitle")}</p>
        </div>
        <Link className="primary-button" href="/decks/new">
          {t("newDeck")}
        </Link>
      </div>

      {folders.length ? (
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Folders">
          <Link
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              !folder ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
            href={`/decks?filter=${filter}&sort=${sort}`}
          >
            All folders
          </Link>
          {folders.map((entry) => (
            <Link
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                folder === entry
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
              href={`/decks?filter=${filter}&sort=${sort}&folder=${encodeURIComponent(entry)}`}
              key={entry}
            >
              {entry}
            </Link>
          ))}
        </div>
      ) : null}

      <form className="mt-8 flex flex-col gap-3 sm:flex-row" method="get">
        <select className="field sm:w-44" defaultValue={filter} name="filter">
          {FILTERS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <select className="field sm:w-44" defaultValue={sort} name="sort">
          {SORTS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <input
          className="field flex-1"
          defaultValue={folder ?? ""}
          name="folder"
          placeholder="Folder / tag"
        />
        <button className="secondary-button" type="submit">
          Apply
        </button>
      </form>

      {decks.length ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard deck={deck} key={deck.id} />
          ))}
        </div>
      ) : (
        <section className="empty-state mt-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">
            First run
          </p>
          <h2 className="mt-2 text-2xl font-black">{t("emptyTitle")}</h2>
          <p className="mt-2 text-slate-600">{t("emptyBody")}</p>
          <ol className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-slate-600">
            <li>1. Create a deck from notes, a URL, or a sample pack.</li>
            <li>2. Study with ratings — hard cards come back sooner.</li>
            <li>3. Try quiz battle, then share or embed when ready.</li>
          </ol>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link className="primary-button" href="/decks/new">
              {t("startCreating")}
            </Link>
            <form action={createSampleDeckAction}>
              <button className="secondary-button" type="submit">
                {t("sampleDeck")}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
