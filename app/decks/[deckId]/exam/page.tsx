import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ExamPlayer } from "@/components/exam-player";
import { requireSession } from "@/lib/auth-server";
import { getDeckArtifact } from "@/lib/data/artifacts";
import { getDeckWithCards } from "@/lib/data/decks";
import type { ExamPayload } from "@/lib/types/notebook";

export default async function DeckExamPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();
  const artifact = await getDeckArtifact(deckId, "exam");
  if (!artifact) notFound();
  const exam = artifact.payload as ExamPayload;
  const t = await getTranslations("exam");

  return (
    <main className="page-shell">
      <Link className="text-button" href={`/decks/${deckId}`}>
        ← {t("back")}
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{exam.title || deck.title}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      <ExamPlayer deckId={deck.id} exam={exam} />
    </main>
  );
}
