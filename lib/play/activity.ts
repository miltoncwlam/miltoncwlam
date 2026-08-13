import { isPlayTemplateId, type PlayTemplateId } from "@/lib/play/templates";

export function activityFromQuery(value?: string | null): PlayTemplateId | null {
  if (!value) return null;
  if (value === "quiz" || value === "study") return null;
  return isPlayTemplateId(value) ? value : null;
}
