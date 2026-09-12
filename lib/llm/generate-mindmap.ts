import { generateObject } from "ai";

import {
  mindmapLabelRules,
  studioIntentRules,
  studioLanguageRules,
  studioSourceSections,
  type StudioDepth,
  type StudioPurpose,
} from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { generateObjectWithRetry } from "@/lib/llm/generate-object-retry";
import { examProfileRules, type ExamSubjectBrain, type ExamSystem } from "@/lib/llm/exam-profiles";
import { mergeMindmapPayloads } from "@/lib/llm/merge-studio";
import { ollamaGenerateJson } from "@/lib/llm/ollama";
import { mindmapSchema, parseMindmapPayload } from "@/lib/llm/parse-studio";
import type { MindmapPayload } from "@/lib/types/notebook";
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

async function generateMindmapSlice(input: {
  source: string;
  language?: string;
  model?: string;
  depth: StudioDepth;
  purpose: StudioPurpose;
  provider?: LLMProvider;
  examSystem?: ExamSystem;
  examSubject?: ExamSubjectBrain;
  sectionNote?: string;
  timeoutMs: number;
}): Promise<{ mindmap: MindmapPayload; usage: StudioUsage }> {
  const prompt = `Build a study mind map as a flat node list from this source.
${studioLanguageRules(input.language ?? "en")}
${mindmapLabelRules(input.language ?? "en")}
${studioIntentRules(input.depth, input.purpose, "mindmap")}
${examProfileRules({
  system: input.examSystem ?? "dse",
  subject: input.examSubject,
  kind: "mindmap",
})}
Rules:
- Exactly one root node with parentId null (the topic). ids n1, n2, n3… with no repeats.
- Main branches (parentId = root id) cover different parts of the source, not synonyms of the title.
- Leaves are facts or examples from the source. One idea per node. No invented facts.
${input.sectionNote ?? ""}

Source:
${input.source}`;
  if (input.provider === "ollama") {
    return {
      mindmap: parseMindmapPayload(await ollamaGenerateJson(prompt)),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
  const result = await generateObjectWithRetry(() =>
    generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: mindmapSchema,
      abortSignal: AbortSignal.timeout(input.timeoutMs),
      prompt,
    }),
  );
  return {
    mindmap: parseMindmapPayload(result.object),
    usage: readUsage(result),
  };
}

export async function generateMindmap(input: {
  source: string;
  language?: string;
  model?: string;
  depth?: StudioDepth;
  purpose?: StudioPurpose;
  provider?: LLMProvider;
  examSystem?: ExamSystem;
  examSubject?: ExamSubjectBrain;
}): Promise<{ mindmap: MindmapPayload; usage: StudioUsage }> {
  const depth = input.depth ?? "basic";
  const purpose = input.purpose ?? "starter";
  const sections = studioSourceSections(input.source, depth);
  const timeoutMs = sections.length > 1 ? 50_000 : 150_000;
  const parts: MindmapPayload[] = [];
  let usage: StudioUsage = { inputTokens: 0, outputTokens: 0 };
  for (const [index, section] of sections.entries()) {
    const generated = await generateMindmapSlice({
      ...input,
      source: section,
      depth,
      purpose,
      timeoutMs,
      sectionNote:
        sections.length > 1
          ? `This is section ${index + 1} of ${sections.length}. Cover only this section. Root is still the overall topic.`
          : undefined,
    });
    parts.push(generated.mindmap);
    usage = {
      inputTokens: usage.inputTokens + generated.usage.inputTokens,
      outputTokens: usage.outputTokens + generated.usage.outputTokens,
    };
  }
  return { mindmap: mergeMindmapPayloads(parts), usage };
}
