import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ReviewQueue } from "@/components/review-queue";
import { requireSession } from "@/lib/auth-server";
import { isV43FeaturesLive } from "@/lib/campaign";
import { listDueCardsAcrossDecks } from "@/lib/data/study";
import { listDueWrongItemsAcrossDecks } from "@/lib/data/wrong-questions";
import { mergeReviewQueue } from "@/lib/study/review-queue";

export default async function ReviewPage() {
  if (!isV43FeaturesLive()) notFound();
  const session = await requireSession();
  const t = await getTranslations("review");
  const [cards, wrongs] = await Promise.all([
    listDueCardsAcrossDecks(session.user.id),
    listDueWrongItemsAcrossDecks(session.user.id),
  ]);
  const items = mergeReviewQueue(cards, wrongs);

  return (
    <main className="page-shell max-w-3xl">
      <Link className="text-button" href="/decks">
        ← {t("back")}
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">
          {items.length ? t("subtitle", { count: items.length }) : t("empty")}
        </p>
      </div>
      {items.length ? (
        <ReviewQueue items={items} />
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
          <p>{t("emptyHint")}</p>
        </section>
      )}
    </main>
  );
}
