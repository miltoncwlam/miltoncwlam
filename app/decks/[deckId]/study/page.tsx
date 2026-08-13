import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { StudyPlayer } from "@/components/study-player";
import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import {
  countDueCards,
  getLatestStudySession,
  startStudySession,
} from "@/lib/data/study";

export default async function StudyPage({
  params,
  searchParams,
}: PageProps<"/decks/[deckId]/study">) {
  const session = await requireSession();
  const t = await getTranslations("study");
  const { deckId } = await params;
  const query = await searchParams;
  const startNew = query.new === "1";
  const shuffled = query.shuffle === "true";
  const dueOnly = query.due === "1";

  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();
  if (deck.generationStatus !== "complete" || deck.cards.length === 0) {
    redirect(`/decks/${deckId}`);
  }

  const latest = startNew
    ? null
    : await getLatestStudySession(deckId, session.user.id);
  const dueCount = await countDueCards(deckId, session.user.id);

  if (dueOnly && dueCount === 0 && !latest) {
    return (
      <main className="page-shell max-w-3xl">
        <Link className="text-button" href={`/decks/${deck.id}`}>
          ← {t("exit")}
        </Link>
        <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-xl">
          <p className="eyebrow">{t("dueEmpty")}</p>
          <p className="page-subtitle mt-3">{t("dueEmptyBody")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              className="primary-button"
              href={`/decks/${deck.id}/play?due=1`}
            >
              {t("playDue")}
            </Link>
            <Link className="secondary-button" href={`/decks/${deck.id}/quiz`}>
              {t("quizInstead")}
            </Link>
            <Link className="text-button" href={`/decks/${deck.id}/study?new=1`}>
              {t("studyAll")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let studySession = latest;
  if (!studySession) {
    try {
      studySession = await startStudySession(
        deckId,
        session.user.id,
        shuffled,
        dueOnly ? "due" : "all",
      );
    } catch {
      redirect(`/decks/${deckId}`);
    }
  }

  const inProgress =
    Boolean(latest) &&
    !startNew &&
    latest != null &&
    latest.completedAt == null &&
    latest.currentIndex > 0 &&
    latest.currentIndex < latest.cardOrder.length;

  return (
    <main className="page-shell max-w-3xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">
            {dueOnly ? t("sessionDue") : t("session")}
            {!dueOnly && dueCount > 0 ? ` · ${t("dueCount", { count: dueCount })}` : ""}
          </p>
          <h1 className="text-2xl font-black text-slate-950">{deck.title}</h1>
          {inProgress ? (
            <p className="mt-2 text-sm text-slate-600">
              {t("continuing", {
                current: latest!.currentIndex + 1,
                total: latest!.cardOrder.length,
              })}{" "}
              <Link className="text-button" href={`/decks/${deck.id}/study?new=1`}>
                {t("startOver")}
              </Link>
            </p>
          ) : null}
        </div>
        <Link className="secondary-button" href={`/decks/${deck.id}`}>
          {t("exit")}
        </Link>
      </div>
      <StudyPlayer
        cards={deck.cards}
        deckId={deck.id}
        initialSession={studySession}
      />
    </main>
  );
}
