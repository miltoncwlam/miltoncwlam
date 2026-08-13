import { notFound } from "next/navigation";

import { joinClassAction } from "@/lib/actions/class-links";
import { requireSession } from "@/lib/auth-server";
import { getClassLinkByToken } from "@/lib/data/class-links";
import { classAssignFromQuery } from "@/lib/play/activity";
import { isPlayTemplateId } from "@/lib/play/templates";
import { getTranslations } from "next-intl/server";

export default async function ClassJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ activity?: string; due?: string; lock?: string }>;
}) {
  await requireSession();
  const t = await getTranslations("play");
  const { token } = await params;
  const query = await searchParams;
  const link = await getClassLinkByToken(token);
  if (!link || link.revoked_at) notFound();
  const assign = classAssignFromQuery(query);
  const assignedName =
    assign.activity && isPlayTemplateId(assign.activity)
      ? t(`templates.${assign.activity}.name`)
      : null;

  return (
    <main className="page-shell max-w-lg text-center">
      <p className="eyebrow">Class deck</p>
      <h1 className="page-title">{link.title}</h1>
      <p className="page-subtitle">
        Join to copy this deck into your library. Teacher has {link.join_count}{" "}
        joins so far.
        {assignedName ? ` Assigned activity: ${assignedName}.` : ""}
        {assign.dueOnly ? " Due-today cards only." : ""}
        {assign.locked ? " This activity is locked." : ""}
      </p>
      <form action={joinClassAction} className="mt-8">
        <input name="token" type="hidden" value={token} />
        {assign.activity ? (
          <input name="activity" type="hidden" value={assign.activity} />
        ) : null}
        {assign.dueOnly ? <input name="due" type="hidden" value="1" /> : null}
        {assign.locked ? <input name="lock" type="hidden" value="1" /> : null}
        <button className="primary-button" type="submit">
          Copy deck to my library
        </button>
      </form>
    </main>
  );
}
