/** Hong Kong school grades and KLAs for community filters. */

export type HkGradeId =
  | "p1"
  | "p2"
  | "p3"
  | "p4"
  | "p5"
  | "p6"
  | "s1"
  | "s2"
  | "s3"
  | "s4"
  | "s5"
  | "s6";

export type HkSubjectId =
  | "chinese"
  | "english"
  | "mathematics"
  | "general-studies"
  | "science"
  | "physics"
  | "chemistry"
  | "biology"
  | "chinese-history"
  | "history"
  | "geography"
  | "economics"
  | "citizenship"
  | "ict"
  | "bafs"
  | "putonghua"
  | "visual-arts"
  | "music"
  | "pe"
  | "psychology"
  | "spanish"
  | "computer-science";

export const HK_GRADES: { id: HkGradeId; label: string; band: "primary" | "secondary" }[] = [
  { id: "p1", label: "Primary 1", band: "primary" },
  { id: "p2", label: "Primary 2", band: "primary" },
  { id: "p3", label: "Primary 3", band: "primary" },
  { id: "p4", label: "Primary 4", band: "primary" },
  { id: "p5", label: "Primary 5", band: "primary" },
  { id: "p6", label: "Primary 6", band: "primary" },
  { id: "s1", label: "Secondary 1", band: "secondary" },
  { id: "s2", label: "Secondary 2", band: "secondary" },
  { id: "s3", label: "Secondary 3", band: "secondary" },
  { id: "s4", label: "Secondary 4", band: "secondary" },
  { id: "s5", label: "Secondary 5", band: "secondary" },
  { id: "s6", label: "Secondary 6", band: "secondary" },
];

export const HK_SUBJECTS: { id: HkSubjectId; label: string }[] = [
  { id: "chinese", label: "Chinese Language" },
  { id: "english", label: "English Language" },
  { id: "mathematics", label: "Mathematics" },
  { id: "general-studies", label: "General Studies" },
  { id: "science", label: "Science" },
  { id: "physics", label: "Physics" },
  { id: "chemistry", label: "Chemistry" },
  { id: "biology", label: "Biology" },
  { id: "chinese-history", label: "Chinese History" },
  { id: "history", label: "History" },
  { id: "geography", label: "Geography" },
  { id: "economics", label: "Economics" },
  { id: "citizenship", label: "Citizenship & Social Development" },
  { id: "ict", label: "ICT" },
  { id: "bafs", label: "BAFS" },
  { id: "putonghua", label: "Putonghua" },
  { id: "visual-arts", label: "Visual Arts" },
  { id: "music", label: "Music" },
  { id: "pe", label: "Physical Education" },
  { id: "psychology", label: "Psychology" },
  { id: "spanish", label: "Spanish" },
  { id: "computer-science", label: "Computer Science" },
];

const SUBJECT_LABELS = Object.fromEntries(
  HK_SUBJECTS.map((s) => [s.id, s.label]),
) as Record<string, string>;

const GRADE_LABELS = Object.fromEntries(
  HK_GRADES.map((g) => [g.id, g.label]),
) as Record<string, string>;

/** Title-case slug labels: "chinese-history" → "Chinese History". */
export function formatTagLabel(tag: string | null | undefined): string {
  if (!tag?.trim()) return "General";
  const key = tag.trim().toLowerCase();
  if (SUBJECT_LABELS[key]) return SUBJECT_LABELS[key];
  if (GRADE_LABELS[key]) return GRADE_LABELS[key];
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatGradeLabel(grade: string | null | undefined): string {
  if (!grade?.trim()) return "";
  return formatTagLabel(grade);
}
