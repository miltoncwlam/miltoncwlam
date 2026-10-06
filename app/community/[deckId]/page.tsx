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
import { isV44FeaturesLive } from "@/lib/campaign";
import { displayNamesForUsers } from "@/lib/clerk";
import { communityCreatorName } from "@/lib/community/copies";
import {
  formatGradeLabel,
  formatTagLabel,
} from "@/lib/community/hk-curriculum";
import { getPublicCommunityDeck } from "@/lib/data/community";
import { listDeckArtifacts } from "@/lib/data/artifacts";
import { pool } from "@/lib/db";
import { getUserRating, listDeckComments, userLikedDeck } from "@/lib/data/social";
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
  const [liked, comments, meta, artifacts, userRating] = await Promise.all([
    userLikedDeck(deck.id, session.user.id),
    listDeckComments(deck.id),
    pool.query<{
      like_count: number;
      is_featured: boolean;
      rating_avg: number;
      rating_count: number;
      copy_count: number;
    }>(
      `select like_count, is_featured, rating_avg, rating_count, copy_count
       from decks where id = $1`,
      [deck.id],
    ),
    listDeckArtifacts(deck.id),
    getUserRating(deck.id, session.user.id),
  ]);
  const names = await displayNamesForUsers([
    deck.userId,
    ...comments.map((comment) => comment.user_id),
  ]);
  const creatorName = communityCreatorName(deck.userId, names);
  const latestComplete = (kind: "notes" | "mindmap" | "exam") =>
    [...artifacts]
      .reverse()
      .find((item) => item.kind === kind && item.generationStatus === "complete");
  const notes = latestComplete("notes");
  const mindmap = latestComplete("mindmap");
  const exam = latestComplete("exam");

  const ratingAvg = Number(meta.rows[0]?.rating_avg ?? 0);
  const ratingCount = Number(meta.rows[0]?.rating_count ?? 0);
  const copyCount = Number(meta.rows[0]?.copy_count ?? 0);
  const v43 = isV44FeaturesLive();
  const subjectLabel = formatTagLabel(deck.subjectTag);
  const gradeLabel = formatGradeLabel(deck.gradeTag);
  const metaBits = [
    subjectLabel,
    gradeLabel || null,
    deck.cards.length ? t("cards", { count: deck.cards.length }) : t("notebook"),
    v43 && meta.rows[0]?.is_featured ? t("featured") : null,
    v43 && ratingCount
      ? t("rating", { avg: ratingAvg.toFixed(1), count: ratingCount })
      : null,
    v43 && copyCount ? t("copies", { count: copyCount }) : null,
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
          {v43 ? (
            <p className="mt-1 text-sm">
              <Link
                className="font-semibold text-[var(--accent)] hover:underline"
                href={`/community/u/${encodeURIComponent(deck.userId)}`}
              >
                {t("byCreator", { name: creatorName })}
              </Link>
            </p>
          ) : null}
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
        comments={comments.map((comment) => ({
          ...comment,
          authorName: v43
            ? communityCreatorName(comment.user_id, names)
            : undefined,
        }))}
        deckId={deck.id}
        likeCount={meta.rows[0]?.like_count ?? 0}
        liked={liked}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        showRatings={v43}
        userRating={userRating}
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
