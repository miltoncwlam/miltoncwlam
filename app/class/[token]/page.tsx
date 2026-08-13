import { notFound } from "next/navigation";

import { joinClassAction } from "@/lib/actions/class-links";
import { requireSession } from "@/lib/auth-server";
import { getClassLinkByToken } from "@/lib/data/class-links";
import { activityFromQuery } from "@/lib/play/activity";
import { PLAY_TEMPLATES } from "@/lib/play/templates";

export default async function ClassJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ activity?: string }>;
}) {
  await requireSession();
  const { token } = await params;
  const { activity } = await searchParams;
  const link = await getClassLinkByToken(token);
  if (!link || link.revoked_at) notFound();
  const assigned = activityFromQuery(activity);
  const assignedName = PLAY_TEMPLATES.find((item) => item.id === assigned)?.name;

  return (
    <main className="page-shell max-w-lg text-center">
      <p className="eyebrow">Class deck</p>
      <h1 className="page-title">{link.title}</h1>
      <p className="page-subtitle">
        Join to copy this deck into your library. Teacher has {link.join_count}{" "}
        joins so far.
        {assignedName ? ` Assigned activity: ${assignedName}.` : ""}
      </p>
      <form action={joinClassAction} className="mt-8">
        <input name="token" type="hidden" value={token} />
        {assigned ? (
          <input name="activity" type="hidden" value={assigned} />
        ) : null}
        <button className="primary-button" type="submit">
          Copy deck to my library
        </button>
      </form>
    </main>
  );
}
