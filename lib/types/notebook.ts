export const ARTIFACT_KINDS = ["mindmap", "notes", "exam"] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const EXAM_QUESTION_TYPES = [
  "long",
  "short",
  "tf",
  "mcq",
  "matching",
  "cloze_choice",
  "cloze_free",
] as const;
export type ExamQuestionType = (typeof EXAM_QUESTION_TYPES)[number];

export type MindmapNode = {
  id: string;
  parentId: string | null;
  label: string;
};

export type MindmapPayload = {
  title: string;
  nodes: MindmapNode[];
};

export type NotesPayload = {
  title: string;
  markdown: string;
};

export type ExamMatchPair = {
  left: string;
  right: string;
};

export type ExamQuestion = {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  marks: number;
  answer: string;
  markScheme?: string;
  choices?: string[];
  pairs?: ExamMatchPair[];
};

export type ExamPayload = {
  title: string;
  instructions: string;
  questions: ExamQuestion[];
};

export type ArtifactPayload = MindmapPayload | NotesPayload | ExamPayload;

export type DeckArtifact = {
  id: string;
  deckId: string;
  kind: ArtifactKind;
  payload: ArtifactPayload;
  generationStatus: "pending" | "processing" | "complete" | "failed";
  generationModel: string | null;
  generationError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ExamStudentAnswer =
  | string
  | Record<string, string>;

export type ExamAnswers = Record<string, ExamStudentAnswer>;

export type ExamQuestionResult = {
  id: string;
  ok: boolean;
  marksAwarded: number;
  marks: number;
  feedback: string;
  source: "exact" | "ai" | "reject";
};

export type ExamAttempt = {
  id: string;
  deckId: string;
  userId: string;
  answers: ExamAnswers;
  result: ExamQuestionResult[] | null;
  score: number;
  maxScore: number;
  createdAt: Date;
};
