import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CommunityCopyButton } from "@/components/community-copy-button";
import { CommunitySocial } from "@/components/community-social";
import { MindmapTree } from "@/components/mindmap-tree";
import { StudyNotesView } from "@/components/study-notes-view";
import { StudyPlayer } from "@/components/study-player";
import { Button } from "@/components/ui/button";
import { adminAttachCommunityImagesAction } from "@/lib/actions/admin";
import { isAdminUser, requireSession } from "@/lib/auth-server";
import {
  formatGradeLabel,
  formatTagLabel,
} from "@/lib/community/hk-curriculum";
import { getPublicCommunityDeck } from "@/lib/data/community";
import { listDeckArtifacts } from "@/lib/data/artifacts";
import { pool } from "@/lib/db";
import { listDeckComments, userLikedDeck } from "@/lib/data/social";
import type { ExamPayload, MindmapPayload, NotesPayload } from "@/lib/types/notebook";

export default async function CommunityDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const session = await requireSession();
  const { deckId } = await params;
  const deck = await getPublicCommunityDeck(deckId);
  if (!deck) notFound();
  const t = await getTranslations("community");
  const studio = await getTranslations("studio");
  const [liked, comments, meta, artifacts] = await Promise.all([
    userLikedDeck(deck.id, session.user.id),
    listDeckComments(deck.id),
    pool.query<{ like_count: number; is_featured: boolean }>(
      `select like_count, is_featured from decks where id = $1`,
      [deck.id],
    ),
    listDeckArtifacts(deck.id),
  ]);
  const notes = artifacts.find(
    (item) => item.kind === "notes" && item.generationStatus === "complete",
  );
  const mindmap = artifacts.find(
    (item) => item.kind === "mindmap" && item.generationStatus === "complete",
  );
  const exam = artifacts.find(
    (item) => item.kind === "exam" && item.generationStatus === "complete",
  );

  const subjectLabel = formatTagLabel(deck.subjectTag);
  const gradeLabel = formatGradeLabel(deck.gradeTag);
  const metaBits = [
    subjectLabel,
    gradeLabel || null,
    deck.cards.length ? t("cards", { count: deck.cards.length }) : t("notebook"),
    deck.isSeed ? t("bySeed") : null,
    meta.rows[0]?.is_featured ? t("featured") : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            className="text-sm font-semibold text-[var(--accent)]"
            href="/community"
          >
            ← {t("title")}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
            {deck.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{metaBits.join(" · ")}</p>
        </div>
        <CommunityCopyButton deckId={deck.id} />
      </div>
      {isAdminUser(session.user) ? (
        <form action={adminAttachCommunityImagesAction} className="flex flex-wrap gap-3">
          <input name="deckId" type="hidden" value={deck.id} />
          <label className="flex items-center gap-2 text-sm">
            <input name="replace" type="checkbox" />
            Replace existing pictures
          </label>
          <Button type="submit" variant="secondary">
            {t("attachImages")}
          </Button>
        </form>
      ) : null}
      <CommunitySocial
        comments={comments}
        deckId={deck.id}
        likeCount={meta.rows[0]?.like_count ?? 0}
        liked={liked}
      />
      {mindmap?.payload ? (
        <MindmapTree
          nodes={(mindmap.payload as MindmapPayload).nodes}
          title={(mindmap.payload as MindmapPayload).title}
        />
      ) : null}
      {notes?.payload ? (
        <StudyNotesView
          markdown={(notes.payload as NotesPayload).markdown}
          title={(notes.payload as NotesPayload).title}
        />
      ) : null}
      {exam?.payload ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">{(exam.payload as ExamPayload).title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {(exam.payload as ExamPayload).questions.length} {studio("questions")}
          </p>
        </section>
      ) : null}
      {deck.cards.length ? (
        <StudyPlayer cards={deck.cards} deckId={deck.id} readOnly />
      ) : null}
    </main>
  );
}
