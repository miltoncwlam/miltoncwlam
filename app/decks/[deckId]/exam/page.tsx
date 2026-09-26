import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ExamHistory } from "@/components/exam-history";
import { ExamPlayer } from "@/components/exam-player";
import { requireSession } from "@/lib/auth-server";
import { isV42FeaturesLive } from "@/lib/campaign";
import { getDeckArtifact, listExamAttempts } from "@/lib/data/artifacts";
import { getDeckWithCards } from "@/lib/data/decks";
import { parseExamPayload } from "@/lib/llm/parse-studio";

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
  const exam = parseExamPayload(artifact.payload);
  const showHistory = isV42FeaturesLive();
  const attempts = showHistory
    ? await listExamAttempts(deckId, session.user.id)
    : [];
  const t = await getTranslations("exam");

  return (
    <main className="page-shell">
      <Link className="text-button no-print" href={`/decks/${deckId}`}>
        ← {t("back")}
      </Link>
      <div className="mt-6 mb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{exam.title || deck.title}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      {showHistory ? <ExamHistory attempts={attempts} /> : null}
      <ExamPlayer deckId={deck.id} exam={exam} />
    </main>
  );
}
