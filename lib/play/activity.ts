import {
  isPlayTemplateId,
  resolvePlayTemplate,
  type PlayTemplateId,
} from "@/lib/play/templates";

export function activityFromQuery(value?: string | null): PlayTemplateId | null {
  if (!value) return null;
  if (value === "quiz" || value === "study") return null;
  return isPlayTemplateId(value) ? value : null;
}

export function dueOnlyFromQuery(value?: string | null) {
  return value === "1" || value === "true";
}

export function lockedFromQuery(value?: string | null) {
  return value === "1" || value === "true";
}

export function classLinkIdFromQuery(value?: string | null) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

export type ClassAssignQuery = {
  activity?: string | null;
  due?: string | null;
  lock?: string | null;
  class?: string | null;
};

export type ClassAssign = {
  activity: PlayTemplateId | null;
  dueOnly: boolean;
  locked: boolean;
  classLinkId: string | null;
};

export function classAssignFromQuery(query: ClassAssignQuery): ClassAssign {
  const activity = activityFromQuery(query.activity);
  const dueOnly = dueOnlyFromQuery(query.due);
  const locked = Boolean(activity) && lockedFromQuery(query.lock);
  return {
    activity,
    dueOnly,
    locked,
    classLinkId: classLinkIdFromQuery(query.class),
  };
}

export function playAssignSearch(assign: Partial<ClassAssign>) {
  const params = new URLSearchParams();
  if (assign.dueOnly) params.set("due", "1");
  if (assign.locked && assign.activity) params.set("lock", "1");
  if (assign.classLinkId) params.set("class", assign.classLinkId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Query string on the public /class/{token} invite. */
export function classInviteSearch(assign: Partial<ClassAssign>) {
  const params = new URLSearchParams();
  if (assign.activity) params.set("activity", assign.activity);
  if (assign.dueOnly) params.set("due", "1");
  if (assign.locked && assign.activity) params.set("lock", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Where a student lands after copying a class deck. */
export function classJoinPath(deckId: string, assign: ClassAssign) {
  const query = playAssignSearch(assign);
  if (assign.activity) {
    const resolved = resolvePlayTemplate(assign.activity);
    const activity = resolved ?? assign.activity;
    return `/decks/${deckId}/play/${activity}${query}`;
  }
  return `/decks/${deckId}/play${query}`;
}
