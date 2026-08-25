import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { listDueCardIds } from "@/lib/data/study";
import { classAssignFromQuery, classJoinPath, playAssignSearch } from "@/lib/play/activity";
import { templatesForDeck } from "@/lib/play/eligibility";
import { isPublicPlayCatalog } from "@/lib/play/templates";
import { PLAY_SKIN_EMOJI, PLAY_SKINS } from "@/lib/play/worlds";

const GROUPS = isPublicPlayCatalog()
  ? (["pairing", "recall"] as const)
  : (["city", "campus"] as const);

export default async function DeckPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string }>;
  searchParams: Promise<{ due?: string; lock?: string; class?: string; activity?: string }>;
}) {
  const session = await requireSession();
  const t = await getTranslations("play");
  const { deckId } = await params;
  const query = await searchParams;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck || deck.generationStatus !== "complete" || !deck.cards.length) {
    notFound();
  }

  const assign = classAssignFromQuery(query);
  if (assign.locked && assign.activity) {
    redirect(classJoinPath(deck.id, assign));
  }

  const dueIds = assign.dueOnly
    ? new Set(await listDueCardIds(deck.id, session.user.id))
    : null;
  const cards = dueIds
    ? deck.cards.filter((card) => dueIds.has(card.id))
    : deck.cards;
  const templates = templatesForDeck(cards);
  const dueQuery = playAssignSearch(assign);

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deck.id}`}>
        ← {t("backToDeck")}
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t(isPublicPlayCatalog() ? "eyebrowPublic" : "eyebrow")}</p>
        <h1 className="page-title">{t("title", { deck: deck.title })}</h1>
        <p className="page-subtitle">{t(isPublicPlayCatalog() ? "subtitlePublic" : "subtitle")}</p>
        <p className="mt-3 text-sm">
          {assign.dueOnly ? (
            <Link className="text-button" href={`/decks/${deck.id}/play${playAssignSearch({ ...assign, dueOnly: false })}`}>
              {t("dueCards", { count: cards.length })}
            </Link>
          ) : (
            <Link
              className="text-button"
              href={`/decks/${deck.id}/play${playAssignSearch({ ...assign, dueOnly: true })}`}
            >
              {t("dueToday")}
            </Link>
          )}
        </p>
      </div>
      {GROUPS.map((group) => {
        const items = templates.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <section className="mb-8 space-y-3" key={group}>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
              {t(`groups.${group}`)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) =>
                item.blocked ? (
                  <div
                    className={`play-pick is-blocked play-stage--${PLAY_SKINS[item.id]}${isPublicPlayCatalog() ? " is-public" : ""}`}
                    key={item.id}
                  >
                    <p className="font-bold">
                      {isPublicPlayCatalog() ? item.name : t(`templates.${item.id}.name`)}
                    </p>
                    <p className="mt-1 text-sm">{t(`blocked.${item.blocked}`)}</p>
                    <span className="play-pick-emoji" aria-hidden>
                      {isPublicPlayCatalog()
                        ? item.id === "type-the-answer"
                          ? "⌨️"
                          : "🃏"
                        : PLAY_SKIN_EMOJI[PLAY_SKINS[item.id]]}
                    </span>
                  </div>
                ) : (
                  <Link
                    className={`play-pick play-stage--${PLAY_SKINS[item.id]}${isPublicPlayCatalog() ? " is-public" : ""}`}
                    href={`/decks/${deck.id}/play/${item.id}${dueQuery}`}
                    key={item.id}
                  >
                    <p className="font-bold">
                      {isPublicPlayCatalog() ? item.name : t(`templates.${item.id}.name`)}
                    </p>
                    <p className="mt-1 text-sm">
                      {isPublicPlayCatalog() ? item.blurb : t(`templates.${item.id}.blurb`)}
                    </p>
                    <span className="play-pick-emoji" aria-hidden>
                      {isPublicPlayCatalog()
                        ? item.id === "type-the-answer"
                          ? "⌨️"
                          : "🃏"
                        : PLAY_SKIN_EMOJI[PLAY_SKINS[item.id]]}
                    </span>
                  </Link>
                ),
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
