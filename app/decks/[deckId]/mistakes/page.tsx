import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { MistakeBook } from "@/components/mistake-book";
import { requireSession } from "@/lib/auth-server";
import { getDeckWithCards } from "@/lib/data/decks";
import { listWrongItems } from "@/lib/data/wrong-questions";

export default async function DeckMistakesPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();
  const items = await listWrongItems(deck.id, session.user.id);
  const t = await getTranslations("mistakes");
  const dueCount = items.filter((item) => item.isDue).length;

  return (
    <main className="page-shell">
      <Link className="text-button no-print" href={`/decks/${deckId}`}>
        ← {t("back")}
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">
          {items.length
            ? t("subtitle", { count: items.length, due: dueCount })
            : t("empty")}
        </p>
      </div>
      <MistakeBook deckId={deck.id} items={items} />
    </main>
  );
}
