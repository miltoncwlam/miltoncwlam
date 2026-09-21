import { getTranslations } from "next-intl/server";

import { CommunityDeckCard } from "@/components/community-deck-card";
import {
  formatTagLabel,
  HK_GRADES,
  HK_SUBJECTS,
} from "@/lib/community/hk-curriculum";
import { communityCreatorName } from "@/lib/community/copies";
import { requireSession } from "@/lib/auth-server";
import { displayNamesForUsers } from "@/lib/clerk";
import {
  listPublicCommunityDecks,
  type CommunityDeckSummary,
} from "@/lib/data/community";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; grade?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const t = await getTranslations("community");
  const studio = await getTranslations("studio");
  const decks = await listPublicCommunityDecks({
    query: params.q,
    subject: params.subject,
    grade: params.grade,
  });
  const names = await displayNamesForUsers(decks.map((deck) => deck.ownerUserId));
  const translate = t as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const studioTranslate = studio as unknown as (key: string) => string;

  const featured = decks.filter((deck) => deck.isFeatured);
  const rest = decks.filter((deck) => !deck.isFeatured);
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
          {featured.length ? (
            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold">{t("featured")}</h2>
              <ul className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
                {featured.map((deck) => (
                  <CommunityDeckCard
                    compact
                    creatorName={communityCreatorName(deck.ownerUserId, names)}
                    deck={deck}
                    key={deck.id}
                    studio={studioTranslate}
                    t={translate}
                  />
                ))}
              </ul>
            </section>
          ) : null}
          {[...bySubject.entries()].map(([subject, packs]) => (
            <section className="space-y-3" key={subject}>
              <h2 className="font-display text-xl font-bold">{subject}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {packs.map((deck) => (
                  <CommunityDeckCard
                    creatorName={communityCreatorName(deck.ownerUserId, names)}
                    deck={deck}
                    key={deck.id}
                    studio={studioTranslate}
                    t={translate}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
