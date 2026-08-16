import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PlayDispatcher } from "@/components/play/play-dispatcher";
import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { listDueCardIds } from "@/lib/data/study";
import { classAssignFromQuery, playAssignSearch } from "@/lib/play/activity";
import { templateReason } from "@/lib/play/eligibility";
import { isPlayTemplateId, resolvePlayTemplate } from "@/lib/play/templates";
import { getTranslations } from "next-intl/server";

export default async function DeckPlayTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ deckId: string; template: string }>;
  searchParams: Promise<{ t?: string; due?: string; lock?: string; class?: string }>;
}) {
  const session = await requireSession();
  const { deckId, template } = await params;
  const query = await searchParams;
  if (!isPlayTemplateId(template)) notFound();
  const resolved = resolvePlayTemplate(template);
  if (resolved === "study") {
    redirect(`/decks/${deckId}/study`);
  }
  if (resolved && resolved !== template) {
    const assign = classAssignFromQuery({ ...query, activity: resolved });
    redirect(`/decks/${deckId}/play/${resolved}${playAssignSearch(assign)}`);
  }
  if (!resolved) notFound();

  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck || deck.generationStatus !== "complete" || !deck.cards.length) {
    notFound();
  }

  const assign = classAssignFromQuery({ ...query, activity: template });
  const dueIds = assign.dueOnly
    ? new Set(await listDueCardIds(deck.id, session.user.id))
    : null;
  const cards = dueIds
    ? deck.cards.filter((card) => dueIds.has(card.id))
    : deck.cards;
  const blocked = templateReason(template, cards);
  const assignQuery = playAssignSearch(assign);
  const backHref = assign.locked
    ? `/decks/${deck.id}`
    : `/decks/${deck.id}/play${assignQuery}`;
  const replayHref = `/decks/${deck.id}/play/${template}${assignQuery}`;
  const t = await getTranslations("play");

  return (
    <main className="page-shell">
      <div className="mt-4 mb-4">
        <Link className="text-button" href={backHref}>
          {assign.locked ? "← Deck" : "← Activities"}
        </Link>
      </div>
      {blocked ? (
        <p className="empty-state">{t(`blocked.${blocked}`)}</p>
      ) : (
        <PlayDispatcher
          cards={cards}
          classLinkId={assign.classLinkId}
          deckId={deck.id}
          homeHref={backHref}
          key={query.t ?? "play"}
          replayHref={replayHref}
          template={template}
        />
      )}
    </main>
  );
}
