import type { GeneratedFlashcard } from "@/lib/types/flashcard";
import type { HkGradeId, HkSubjectId } from "@/lib/community/hk-curriculum";
import { attachQuizOptions } from "@/lib/quiz/choices";

export type CommunitySeedPack = {
  slug: string;
  title: string;
  subjectTag: HkSubjectId | string;
  gradeTag?: HkGradeId | null;
  featured?: boolean;
  cards: GeneratedFlashcard[];
};

export function qa(
  front: string,
  back: string,
  category?: string,
  extra?: { artKey?: string; imageSearchQuery?: string },
): GeneratedFlashcard {
  return {
    front,
    back,
    category,
    type: "qa",
    artKey: extra?.artKey,
    imageSearchQuery: extra?.imageSearchQuery,
  };
}

export function pack(
  slug: string,
  title: string,
  subjectTag: HkSubjectId | string,
  gradeTag: HkGradeId | null,
  cards: GeneratedFlashcard[],
  featured = false,
): CommunitySeedPack {
  return {
    slug,
    title,
    subjectTag,
    gradeTag,
    cards: attachQuizOptions(cards),
    featured,
  };
}
