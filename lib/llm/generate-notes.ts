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
  cleanStudyNotes,
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
Use ## headings taken from the source’s teaching topics (what the topic is, how time is measured, the timeline, people).
Skip learning outcomes, enquiry questions, brainstorms, activities, fill-in blanks, and instructions such as “find in the illustration” or “are students to use.”
Do not add a heading named Summary, Enquiry, Brainstorm, Activity, or Learning Outcomes.
Under each heading write only "- " bullets. Each bullet is one complete summary point (a short sentence).
One event or person per bullet. Write years of 10000 or more with thousands separators, such as 7,000,000 BC.
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

function programmedNotes(notes: NotesPayload): NotesPayload {
  const markdown = cleanStudyNotes(notes.markdown);
  if (!notesAreStudyReady(markdown)) return notes;
  return { title: notes.title, markdown };
}

async function polishNotes(input: {
  notes: NotesPayload;
  language: string;
  model?: string;
  provider?: LLMProvider;
  timeoutMs: number;
}): Promise<{ notes: NotesPayload; usage: StudioUsage }> {
  const programmed = programmedNotes(input.notes);
  if (!notesAreStudyReady(programmed.markdown)) {
    return { notes: programmed, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  const prompt = `Clean these revision notes. Keep the same language and only facts already written here.
Remove worksheet questions, fill-in blanks, activity instructions, syllabus outcomes, and headings named Summary, Enquiry, Brainstorm, Activity, or Learning Outcomes.
Put each kept fact under the teaching topic it belongs to. One event or person per bullet.
Write years of 10000 or more with thousands separators. Do not invent a new date range.
${studioLanguageRules(input.language)}
${notesOutputRules()}

Title: ${programmed.title}

Notes:
${programmed.markdown}`;

  try {
    const run = async () => {
      if (input.provider === "ollama") {
        const object = await ollamaGenerateJson(prompt);
        return {
          notes: programmedNotes(parseNotesPayload(object)),
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      }
      const result = await generateObject({
        model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
        schema: notesSchema,
        abortSignal: AbortSignal.timeout(input.timeoutMs),
        prompt,
      });
      return {
        notes: programmedNotes(parseNotesPayload(result.object)),
        usage: readUsage(result),
      };
    };
    const polished = await generateObjectWithRetry(run);
    const next = cleanStudyNotes(polished.notes.markdown);
    if (
      !notesAreStudyReady(next) ||
      notesContainPromptLeak(next) ||
      next.length < programmed.markdown.length * 0.45
    ) {
      return { notes: programmed, usage: polished.usage };
    }
    return {
      notes: { title: polished.notes.title.trim() || programmed.title, markdown: next },
      usage: polished.usage,
    };
  } catch {
    return { notes: programmed, usage: { inputTokens: 0, outputTokens: 0 } };
  }
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
          ? `This is section ${index + 1} of ${sections.length} of a longer source. Cover only the teaching facts in this section. Skip exercises, syllabus outcomes, and captions.`
          : undefined,
    });
    parts.push(generated.notes);
    usage = {
      inputTokens: usage.inputTokens + generated.usage.inputTokens,
      outputTokens: usage.outputTokens + generated.usage.outputTokens,
    };
  }
  const merged = programmedNotes(mergeNotesPayloads(parts, language));
  const polished = await polishNotes({
    notes: merged,
    language,
    model: input.model,
    provider: input.provider,
    timeoutMs: 30_000,
  });
  return {
    notes: polished.notes,
    usage: {
      inputTokens: usage.inputTokens + polished.usage.inputTokens,
      outputTokens: usage.outputTokens + polished.usage.outputTokens,
    },
  };
}
