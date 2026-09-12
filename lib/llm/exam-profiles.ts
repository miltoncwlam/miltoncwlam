export const EXAM_SYSTEMS = ["dse", "igcse", "a-level"] as const;
export type ExamSystem = (typeof EXAM_SYSTEMS)[number];
export type ExamSubjectBrain = "chinese-history" | "biology" | "chemistry" | null;

export const DEFAULT_EXAM_SYSTEM: ExamSystem = "dse";

export const EXAM_SYSTEM_LABELS: Record<ExamSystem, string> = {
  dse: "HKDSE",
  igcse: "IGCSE",
  "a-level": "A-level",
};

export function parseExamSystem(value: unknown): ExamSystem {
  if (value === "igcse" || value === "a-level" || value === "dse") return value;
  return DEFAULT_EXAM_SYSTEM;
}

function haystack(input: {
  filename?: string | null;
  title?: string | null;
  source?: string | null;
  language?: string | null;
}) {
  return [input.filename, input.title, input.source?.slice(0, 4_000), input.language]
    .filter(Boolean)
    .join("\n");
}

export function inferExamSubject(blob: string): ExamSubjectBrain {
  if (
    /中國歷史|中国历史|中史|chinese history|夏朝|商朝|周朝|秦朝|漢朝|汉朝|舊石器|旧石器|禪讓|禅让|\bs[1-6]\s*ch\b/i.test(
      blob,
    )
  ) {
    return "chinese-history";
  }
  if (/photosynth|chlorophyll|chloroplast|calvin|光合|葉綠|叶绿|\bbiolog/i.test(blob)) {
    return "biology";
  }
  if (
    /chemistry|化學|化学|\bmole\b|electrolysis|oxidat|ionic bond|acid-base/i.test(blob)
  ) {
    return "chemistry";
  }
  return null;
}

export function inferExamSystem(blob: string): ExamSystem {
  if (/\bigcse\b|\bgcse\b|cambridge igcse|edexcel/i.test(blob)) return "igcse";
  if (/\ba[\s-]?levels?\b|\bas[\s-]?level\b|\ba2\b/i.test(blob)) return "a-level";
  if (
    /\bhkdse\b|\bdse\b|文憑試|文凭试|中學文憑|中学文凭|\bs[1-6]\b|中[一二三四五六]/i.test(
      blob,
    )
  ) {
    return "dse";
  }
  return DEFAULT_EXAM_SYSTEM;
}

/** Unknown board → HKDSE. Subject brains only for 中史, Biology, Chemistry. */
export function inferExamLane(input: {
  filename?: string | null;
  title?: string | null;
  source?: string | null;
  language?: string | null;
}): { system: ExamSystem; subject: ExamSubjectBrain } {
  const blob = haystack(input);
  return {
    system: inferExamSystem(blob),
    subject: inferExamSubject(blob),
  };
}

export function examProfileRules(input: {
  system: ExamSystem;
  subject?: ExamSubjectBrain;
  kind: "notes" | "mindmap" | "exam" | "cards";
}): string {
  const systemLine =
    input.system === "igcse"
      ? "EXAM LANE: Cambridge IGCSE. Command words: define, describe, explain, suggest, calculate. Short structured items. Keep wording a student would see on an IGCSE paper."
      : input.system === "a-level"
        ? "EXAM LANE: A-level. Command words: describe, explain, assess, evaluate, discuss. Longer reasoning. Mark schemes should reward knowledge plus application."
        : "EXAM LANE: HKDSE. Prefer 書面語 when writing Chinese. Command words: 解釋 / 說明 / 比較 / 評鑑, or describe / explain / account for in English. Paper items should feel like a Hong Kong secondary exam.";

  let subjectLine = "";
  if (input.subject === "chinese-history") {
    subjectLine =
      input.kind === "mindmap"
        ? "SUBJECT: 中國歷史. One era or event per node. Chronology, 治亂興衰, cause and effect. Never glue two dynasties into one label."
        : "SUBJECT: 中國歷史. Prefer chronology, 治亂興衰, cause/effect, and compare/contrast. Do not invent dates or emperors.";
  } else if (input.subject === "biology") {
    subjectLine =
      "SUBJECT: Biology. Name processes, inputs, outputs, and where they happen. No invented pathways or extra organelles.";
  } else if (input.subject === "chemistry") {
    subjectLine =
      "SUBJECT: Chemistry. Keep formulae and state symbols only if the source has them. No invented mechanisms.";
  }

  return [systemLine, subjectLine].filter(Boolean).join("\n");
}
