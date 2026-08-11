import type { GeneratedFlashcard } from "@/lib/types/flashcard";
import type { HkGradeId, HkSubjectId } from "@/lib/community/hk-curriculum";

export type CommunitySeedPack = {
  slug: string;
  title: string;
  subjectTag: HkSubjectId | string;
  gradeTag?: HkGradeId | null;
  cards: GeneratedFlashcard[];
};

export function qa(
  front: string,
  back: string,
  category?: string,
): GeneratedFlashcard {
  return { front, back, category, type: "qa" };
}

export function pack(
  slug: string,
  title: string,
  subjectTag: HkSubjectId | string,
  gradeTag: HkGradeId | null,
  cards: GeneratedFlashcard[],
): CommunitySeedPack {
  return { slug, title, subjectTag, gradeTag, cards };
}
