import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PrintPackButton } from "@/components/print-pack-button";
import { StudyNotesView } from "@/components/study-notes-view";
import { requireSession } from "@/lib/auth-server";
import { getDeckArtifact } from "@/lib/data/artifacts";
import { getDeckWithCards } from "@/lib/data/decks";
import { parseExamPayload } from "@/lib/llm/parse-studio";
import type { NotesPayload } from "@/lib/types/notebook";

export default async function DeckPrintPackPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getDeckWithCards(deckId, session.user.id);
  if (!deck) notFound();
  const [notesArtifact, examArtifact] = await Promise.all([
    getDeckArtifact(deck.id, "notes"),
    getDeckArtifact(deck.id, "exam"),
  ]);
  const notes =
    notesArtifact?.generationStatus === "complete"
      ? (notesArtifact.payload as NotesPayload)
      : null;
  const exam =
    examArtifact?.generationStatus === "complete"
      ? parseExamPayload(examArtifact.payload)
      : null;
  if (!notes?.markdown && !exam?.questions.length) notFound();
  const t = await getTranslations("printPack");
  const te = await getTranslations("exam");

  return (
    <main className="page-shell print-pack">
      <div className="no-print mt-2 flex items-center justify-between gap-4">
        <Link className="text-button" href={`/decks/${deckId}`}>
          ← {t("back")}
        </Link>
        <PrintPackButton />
      </div>

      <header className="mt-6 mb-8">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{deck.title}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </header>

      {notes?.markdown ? (
        <section className="print-pack-section">
          <StudyNotesView markdown={notes.markdown} title={notes.title} />
        </section>
      ) : null}

      {exam?.questions.length ? (
        <section className="print-pack-section print-pack-break">
          <p className="eyebrow">{t("examSection")}</p>
          <h2 className="mt-2 text-2xl font-black">
            {exam.title || deck.title}
          </h2>
          {exam.instructions ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
              {exam.instructions}
            </p>
          ) : null}
          <div className="mt-6 space-y-5">
            {exam.questions.map((question, index) => (
              <article className="print-pack-question" key={question.id}>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  {index + 1}. {te(`types.${question.type}`)} · {question.marks}{" "}
                  {te("marks")}
                </p>
                <p className="mt-2 font-semibold">{question.prompt}</p>
                {question.choices?.length &&
                ["mcq", "tf", "cloze_choice"].includes(question.type) ? (
                  <ol className="mt-2 list-none space-y-1 text-sm">
                    {question.choices.map((choice, choiceIndex) => (
                      <li key={choice}>
                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {question.type === "matching" && question.pairs?.length ? (
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <ul className="space-y-1">
                      {question.pairs.map((pair) => (
                        <li key={pair.left}>{pair.left}</li>
                      ))}
                    </ul>
                    <ul className="space-y-1">
                      {question.pairs.map((pair) => (
                        <li key={pair.right}>{pair.right}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {question.type === "long" || question.type === "short" ? (
                  <div className="print-pack-lines" aria-hidden="true" />
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {exam?.questions.length ? (
        <section className="print-pack-section print-pack-break">
          <p className="eyebrow">{t("answerKey")}</p>
          <div className="mt-4 space-y-3">
            {exam.questions.map((question, index) => (
              <p className="text-sm" key={question.id}>
                <span className="font-black">{index + 1}. </span>
                {question.markScheme || question.answer}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
