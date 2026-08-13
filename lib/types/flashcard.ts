import type { ImageAttribution } from "@/lib/images/license";

export type SourceType = "text" | "file" | "photo" | "url";

export type SourceRetention = "none" | "24h" | "keep";

export type CardRating = "easy" | "ok" | "hard";

export type LLMProvider = "openrouter";

export const LEGACY_CLOUD_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
] as const;

export function normalizeLLMProvider(
  value: string | null | undefined,
): LLMProvider | null {
  if (value === "openrouter" || value === "ollama") return "openrouter";
  if (value && LEGACY_CLOUD_PROVIDERS.includes(value as (typeof LEGACY_CLOUD_PROVIDERS)[number])) {
    return "openrouter";
  }
  return null;
}

export type GenerationStatus = "pending" | "processing" | "complete" | "failed";

export type CardType = "qa" | "definition" | "cloze" | "mcq";

export type QuestionStyle = "mixed" | CardType;

export type DeckVisibility = "private" | "unlisted" | "public";

export type ModerationStatus = "none" | "pending" | "approved" | "rejected";

export type Deck = {
  id: string;
  userId: string;
  title: string;
  sourceType: SourceType;
  sourceContent: string | null;
  storagePath: string | null;
  sourceFilename: string | null;
  sourceMimeType: string | null;
  sourceSizeBytes: number | null;
  generationStatus: GenerationStatus;
  generationProvider: LLMProvider | null;
  generationModel: string | null;
  generationError: string | null;
  isShared: boolean;
  visibility: DeckVisibility;
  subjectTag: string | null;
  gradeTag: string | null;
  moderationStatus: ModerationStatus;
  moderationReasons: string | null;
  listedAt: Date | null;
  isSeed: boolean;
  archivedAt: Date | null;
  folderTag: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string | null;
  category: string | null;
  cardType: CardType;
  options: string[] | null;
  imageUrl: string | null;
  imageAttribution: ImageAttribution | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type StudySession = {
  id: string;
  deckId: string;
  userId: string;
  cardOrder: string[];
  currentIndex: number;
  startedAt: Date;
  completedAt: Date | null;
};

export type GeneratedFlashcard = {
  front: string;
  back: string;
  hint?: string;
  category?: string;
  type?: CardType;
  options?: string[];
  imagePrompt?: string;
  imageSearchQuery?: string;
  imageUrl?: string;
  imageAttribution?: ImageAttribution;
  artKey?: string;
};

export type GeneratedDeck = {
  title: string;
  cards: GeneratedFlashcard[];
  usage?: { inputTokens: number; outputTokens: number };
};

export type DeckWithCards = Deck & {
  cards: Flashcard[];
};

export type DeckSummary = Pick<
  Deck,
  | "id"
  | "title"
  | "sourceType"
  | "generationStatus"
  | "generationError"
  | "isShared"
  | "visibility"
  | "subjectTag"
  | "gradeTag"
  | "archivedAt"
  | "folderTag"
  | "createdAt"
  | "updatedAt"
> & {
  cardCount: number;
};

export type LibrarySort = "recent" | "title" | "cards";
export type LibraryFilter =
  | "active"
  | "archived"
  | "incomplete"
  | "public"
  | "quiz-ready"
  | "all";

export type QuizSession = {
  id: string;
  deckId: string;
  userId: string;
  questionOrder: string[];
  currentIndex: number;
  score: number;
  total: number;
  startedAt: Date;
  completedAt: Date | null;
};
