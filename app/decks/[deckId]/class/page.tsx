import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClassLinkControls } from "@/components/class-link-controls";
import { requireSession } from "@/lib/auth-server";
import { displayNamesForUsers } from "@/lib/clerk";
import { listClassExamAttemptsForDeck } from "@/lib/data/artifacts";
import { listClassLinksForDeck } from "@/lib/data/class-links";
import { getDeckWithCards } from "@/lib/data/decks";
import { listClassRunsForDeck } from "@/lib/data/games";
import { isPlayTemplateId } from "@/lib/play/templates";

function shortUser(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export default async function DeckClassPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const tPlay = await getTranslations("play");
  const t = await getTranslations("class");
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();

  const [links, runs, exams] = await Promise.all([
    listClassLinksForDeck(deck.id, session.user.id),
    listClassRunsForDeck(deck.id, session.user.id),
    listClassExamAttemptsForDeck(deck.id, session.user.id),
  ]);
  const names = await displayNamesForUsers([
    ...runs.map((run) => run.userId),
    ...exams.map((attempt) => attempt.userId),
  ]);

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deck.id}`}>
        ← Back to deck
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-10">
          <div>
            <h2 className="text-xl font-black">{t("playScores")}</h2>
            {runs.length ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("student")}</th>
                      <th className="px-4 py-3">{t("activity")}</th>
                      <th className="px-4 py-3">{t("score")}</th>
                      <th className="px-4 py-3">{t("energy")}</th>
                      <th className="px-4 py-3">{t("finished")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr className="border-b border-slate-100" key={run.id}>
                        <td className="px-4 py-3 font-semibold">
                          {names.get(run.userId) || shortUser(run.userId)}
                        </td>
                        <td className="px-4 py-3">
                          {isPlayTemplateId(run.template)
                            ? tPlay(`templates.${run.template}.name`)
                            : run.template}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {run.score}/{run.maxScore}
                        </td>
                        <td className="px-4 py-3">
                          {run.payout > 0 ? `+${run.payout}` : `−${run.stake}`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {run.completedAt.toISOString().replace("T", " ").slice(0, 16)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                {t("emptyPlay")}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-black">{t("examScores")}</h2>
            {exams.length ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("student")}</th>
                      <th className="px-4 py-3">{t("activity")}</th>
                      <th className="px-4 py-3">{t("score")}</th>
                      <th className="px-4 py-3">{t("finished")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((attempt) => (
                      <tr className="border-b border-slate-100" key={attempt.id}>
                        <td className="px-4 py-3 font-semibold">
                          {names.get(attempt.userId) || shortUser(attempt.userId)}
                        </td>
                        <td className="px-4 py-3">{t("exam")}</td>
                        <td className="px-4 py-3 font-semibold">
                          {attempt.score}/{attempt.maxScore}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {attempt.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                {t("emptyExam")}
              </p>
            )}
          </div>
        </section>
        <aside className="space-y-4">
          <ClassLinkControls deckId={deck.id} links={links} />
          <p className="text-sm text-slate-600">{t("generateExamFirst")}</p>
        </aside>
      </div>
    </main>
  );
}
