import { generateObject } from "ai";

import {
  studioIntentRules,
  studioLanguageRules,
  studioNotesChunkChars,
  studioSourceSections,
  type StudioDepth,
  type StudioPurpose,
} from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import {
  examProfileRules,
  type ExamSubjectBrain,
  type ExamSystem,
} from "@/lib/llm/exam-profiles";
import { generateObjectWithRetry } from "@/lib/llm/generate-object-retry";
import { mergeNotesPayloads } from "@/lib/llm/merge-studio";
import { ollamaGenerateJson } from "@/lib/llm/ollama";
import { notesSchema, parseNotesPayload } from "@/lib/llm/parse-studio";
import {
  forceStudyNotesShape,
  isGlossarySheet,
  notesAreStudyReady,
  notesContainPromptLeak,
  pointFormSummary,
} from "@/lib/study/notes-markdown";
import type { NotesPayload } from "@/lib/types/notebook";
import type { LLMProvider } from "@/lib/types/flashcard";

export type StudioUsage = {
  inputTokens: number;
  outputTokens: number;
};

function readUsage(result: {
  usage?: {
    inputTokens?: { total?: number } | number;
    outputTokens?: { total?: number } | number;
  };
}): StudioUsage {
  const input = result.usage?.inputTokens;
  const output = result.usage?.outputTokens;
  const inputTokens =
    typeof input === "number" ? input : Number(input?.total ?? 0);
  const outputTokens =
    typeof output === "number" ? output : Number(output?.total ?? 0);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  };
}

function notesOutputRules() {
  return `Put the title only in the title JSON field. Do not repeat it as a # heading in markdown.
Do not discuss these instructions. Do not explain the language. Markdown is the notes only — no planning sentences.
Write a point-form summary. Not a glossary. Not a term list.
Use ## headings taken from the source (its own topics, periods, or processes).
Under each heading write only "- " bullets. Each bullet is one complete summary point (a short sentence).
3–6 bullets per heading. No paragraphs. No "**Term** definition" lines.
Do NOT use headings like Key terms, Facts, How to remember, 重點詞彙, 史實與脈絡, or 記誦提示.
Real newline characters. No invented facts. No Punycode (xn--).`;
}

function shapeNotes(notes: NotesPayload, _language: string, fallbackSource: string) {
  const title = notes.title.trim() || "Study notes";
  const cleaned = forceStudyNotesShape(notes.markdown);
  if (notesAreStudyReady(cleaned) && !isGlossarySheet(cleaned)) {
    return { title, markdown: cleaned };
  }
  const fromSource = pointFormSummary(fallbackSource);
  if (notesAreStudyReady(fromSource)) return { title, markdown: fromSource };
  return { title, markdown: cleaned || fromSource };
}

function assertNotesQuality(notes: NotesPayload) {
  if (notesAreStudyReady(notes.markdown)) return;
  throw new Error(
    notesContainPromptLeak(notes.markdown)
      ? "Notes leaked instructions"
      : "Notes were not study-ready",
  );
}

async function generateNotesSlice(input: {
  source: string;
  language: string;
  model?: string;
  depth: StudioDepth;
  purpose: StudioPurpose;
  provider?: LLMProvider;
  examSystem?: ExamSystem;
  examSubject?: ExamSubjectBrain;
  sectionNote?: string;
  timeoutMs: number;
}): Promise<{ notes: NotesPayload; usage: StudioUsage }> {
  const prompt = `Write revision-sheet study notes from this source.
${studioLanguageRules(input.language)}
${studioIntentRules(input.depth, input.purpose, "notes")}
${examProfileRules({
  system: input.examSystem ?? "dse",
  subject: input.examSubject,
  kind: "notes",
})}
${notesOutputRules()}
${input.sectionNote ?? ""}

Source:
${input.source}`;

  async function run() {
    if (input.provider === "ollama") {
      const object = await ollamaGenerateJson(prompt);
      const notes = shapeNotes(parseNotesPayload(object), input.language, input.source);
      assertNotesQuality(notes);
      return { notes, usage: { inputTokens: 0, outputTokens: 0 } };
    }
    const result = await generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: notesSchema,
      abortSignal: AbortSignal.timeout(input.timeoutMs),
      prompt,
    });
    const notes = shapeNotes(parseNotesPayload(result.object), input.language, input.source);
    assertNotesQuality(notes);
    return { notes, usage: readUsage(result) };
  }

  try {
    return await generateObjectWithRetry(run);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : String(error);
    if (!/timeout|aborted|timed out|TimeoutError|AbortError/i.test(`${name} ${message}`)) {
      throw error;
    }
    const notes = shapeNotes(
      { title: "Study notes", markdown: "" },
      input.language,
      input.source,
    );
    if (!notesAreStudyReady(notes.markdown)) throw error;
    return { notes, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

export async function generateNotes(input: {
  source: string;
  language?: string;
  model?: string;
  depth?: StudioDepth;
  purpose?: StudioPurpose;
  provider?: LLMProvider;
  examSystem?: ExamSystem;
  examSubject?: ExamSubjectBrain;
}): Promise<{ notes: NotesPayload; usage: StudioUsage }> {
  const language = input.language ?? "en";
  const depth = input.depth ?? "basic";
  const purpose = input.purpose ?? "starter";
  const sections = studioSourceSections(
    input.source,
    depth,
    studioNotesChunkChars(depth),
  );
  const timeoutMs = 40_000;
  const parts: NotesPayload[] = [];
  let usage: StudioUsage = { inputTokens: 0, outputTokens: 0 };
  for (const [index, section] of sections.entries()) {
    const generated = await generateNotesSlice({
      ...input,
      source: section,
      language,
      depth,
      purpose,
      timeoutMs,
      sectionNote:
        sections.length > 1
          ? `This is section ${index + 1} of ${sections.length} of a longer source. Cover only this section. Headings from this section’s topics.`
          : undefined,
    });
    parts.push(generated.notes);
    usage = {
      inputTokens: usage.inputTokens + generated.usage.inputTokens,
      outputTokens: usage.outputTokens + generated.usage.outputTokens,
    };
  }
  return { notes: mergeNotesPayloads(parts, language), usage };
}
