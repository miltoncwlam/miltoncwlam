import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CommunityCopyButton } from "@/components/community-copy-button";
import {
  encyclopediaBandFromTitle,
  encyclopediaTopicTitle,
  formatGradeLabel,
  formatTagLabel,
  HK_GRADES,
  HK_SUBJECTS,
} from "@/lib/community/hk-curriculum";
import { requireSession } from "@/lib/auth-server";
import {
  listPublicCommunityDecks,
  type CommunityDeckSummary,
} from "@/lib/data/community";

function DeckCard({
  deck,
  t,
}: {
  deck: CommunityDeckSummary;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const band = encyclopediaBandFromTitle(deck.title);
  return (
    <li className="deck-card flex flex-col p-5">
      {deck.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="mb-3 h-28 w-full rounded-xl object-cover"
          src={deck.coverImageUrl}
        />
      ) : null}
      <p className="text-xs font-bold tracking-wide text-[var(--accent)]">
        {deck.isFeatured ? `${t("featured")} · ` : null}
        {formatTagLabel(deck.subjectTag)}
        {band
          ? ` · ${band === "primary" ? t("primary") : band === "junior" ? t("junior") : t("senior")}`
          : deck.gradeTag
            ? ` · ${formatGradeLabel(deck.gradeTag)}`
            : null}
      </p>
      <h2 className="mt-2 font-display text-lg font-bold text-[var(--ink)]">
        <Link className="hover:text-[var(--accent)]" href={`/community/${deck.id}`}>
          {deck.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {t("cards", { count: deck.cardCount })}
        {deck.isSeed ? ` · ${t("bySeed")}` : null}
        {` · ♥ ${deck.likeCount}`}
      </p>
      <div className="mt-auto flex gap-2 pt-5">
        <Link className="secondary-button" href={`/community/${deck.id}`}>
          {t("study")}
        </Link>
        <CommunityCopyButton deckId={deck.id} />
      </div>
    </li>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; grade?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const t = await getTranslations("community");
  const decks = await listPublicCommunityDecks({
    query: params.q,
    subject: params.subject,
    grade: params.grade,
  });

  const featured = decks.filter((deck) => deck.isFeatured);
  const rest = decks.filter((deck) => !deck.isFeatured);
  const featuredTopics = new Map<string, CommunityDeckSummary[]>();
  for (const deck of featured) {
    const topic = encyclopediaTopicTitle(deck.title);
    const list = featuredTopics.get(topic) ?? [];
    list.push(deck);
    featuredTopics.set(topic, list);
  }
  const bySubject = new Map<string, CommunityDeckSummary[]>();
  for (const deck of rest) {
    const subject = formatTagLabel(deck.subjectTag);
    const list = bySubject.get(subject) ?? [];
    list.push(deck);
    bySubject.set(subject, list);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">{t("subtitle")}</p>
      </header>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" method="get">
        <input
          className="field flex-1 min-w-[12rem]"
          defaultValue={params.q ?? ""}
          name="q"
          placeholder={t("search")}
        />
        <select
          className="field sm:w-56"
          defaultValue={params.subject ?? ""}
          name="subject"
        >
          <option value="">{t("allSubjects")}</option>
          {HK_SUBJECTS.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.label}
            </option>
          ))}
        </select>
        <select
          className="field sm:w-48"
          defaultValue={params.grade ?? ""}
          name="grade"
        >
          <option value="">{t("allGrades")}</option>
          <optgroup label={t("primary")}>
            {HK_GRADES.filter((g) => g.band === "primary").map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("secondary")}>
            {HK_GRADES.filter((g) => g.band === "secondary").map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.label}
              </option>
            ))}
          </optgroup>
        </select>
        <button className="primary-button" type="submit">
          {t("filter")}
        </button>
      </form>

      {!decks.length ? (
        <p className="rounded-2xl bg-[var(--surface-soft)] p-6 text-[var(--muted)]">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-10">
          {featuredTopics.size ? (
            <section className="space-y-6">
              <h2 className="font-display text-xl font-bold">{t("illustratedTopics")}</h2>
              {[...featuredTopics.entries()].map(([topic, packs]) => (
                <div className="space-y-3" key={topic}>
                  <h3 className="text-sm font-bold tracking-wide text-[var(--muted)]">
                    {topic}
                  </h3>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {packs.map((deck) => (
                      <DeckCard deck={deck} key={deck.id} t={t} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
          {[...bySubject.entries()].map(([subject, packs]) => (
            <section className="space-y-3" key={subject}>
              <h2 className="font-display text-xl font-bold">{subject}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {packs.map((deck) => (
                  <DeckCard deck={deck} key={deck.id} t={t} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
