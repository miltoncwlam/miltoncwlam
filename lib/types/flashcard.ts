export type SourceType = "text" | "file" | "photo" | "url";

export type SourceRetention = "none" | "24h" | "keep";

export type CardRating = "easy" | "ok" | "hard";

export type LLMProvider = "openai" | "anthropic" | "google" | "ollama";

export type OllamaModelId = "gemma4:e4b" | "gemma4:e2b";

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
};

export type GeneratedDeck = {
  title: string;
  cards: GeneratedFlashcard[];
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

export const OLLAMA_MODELS: {
  id: OllamaModelId;
  label: string;
}[] = [
  { id: "gemma4:e2b", label: "Recommended — faster (gemma4:e2b)" },
  { id: "gemma4:e4b", label: "Higher quality — slower (gemma4:e4b)" },
];

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
