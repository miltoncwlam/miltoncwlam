import { generateObject } from "ai";
import { z } from "zod";

import {
  mindmapLabelRules,
  studioIntentRules,
  studioLanguageRules,
  studioRequirementsLine,
  studioSourceSections,
  type StudioDepth,
  type StudioPurpose,
} from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import {
  generateObjectWithRetry,
  isGenerateTimeout,
  shorterStudySource,
  studyPoints,
} from "@/lib/llm/generate-object-retry";
import { examProfileRules, type ExamSubjectBrain, type ExamSystem } from "@/lib/llm/exam-profiles";
import { mindmapFromSource } from "@/lib/mindmap/from-source";
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

function mindmapDespiteTimeout(source: string): MindmapPayload {
  const mindmap = mindmapFromSource(source);
  if (mindmap.nodes.length >= 4) return mindmap;
  const nodes = [...mindmap.nodes];
  if (!nodes.length) nodes.push({ id: "n1", parentId: null, label: mindmap.title || "Study map" });
  const rootId = nodes[0]!.id;
  let next = nodes.length + 1;
  for (const point of studyPoints(source, 8)) {
    if (nodes.length >= 6) break;
    nodes.push({ id: `n${next}`, parentId: rootId, label: point.slice(0, 72) });
    next += 1;
  }
  if (nodes.length < 4) {
    throw new Error("Not enough usable study content. Add more notes or try a longer source.");
  }
  return parseMindmapPayload({ title: mindmap.title || "Study map", nodes });
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
  requirements?: string;
  timeoutMs: number;
  allowShorter?: boolean;
  deadlineMs?: number;
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
- Main branches (parentId = root id) are the source’s topics, not synonyms of the title and not full sentences.
- Each branch has 2–4 children. A child is one short fact, name, or date. No invented facts.
- Labels stay short enough for one bubble. Do not write a paragraph in a node.
${studioRequirementsLine(input.requirements)}
${input.sectionNote ?? ""}

Source:
${input.source}`;
  const deadline = input.deadlineMs ?? Number.POSITIVE_INFINITY;
  if (Date.now() + 12_000 >= deadline) {
    return { mindmap: mindmapDespiteTimeout(input.source), usage: { inputTokens: 0, outputTokens: 0 } };
  }
  if (input.provider === "ollama") {
    return {
      mindmap: parseMindmapPayload(await ollamaGenerateJson(prompt)),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
  try {
    const result = await generateObjectWithRetry(() =>
      generateObject({
        model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
        schema: mindmapSchema,
        abortSignal: AbortSignal.timeout(input.timeoutMs),
        maxRetries: 0,
        prompt,
      }),
    );
    return {
      mindmap: parseMindmapPayload(result.object),
      usage: readUsage(result),
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : String(error);
    if (
      isGenerateTimeout(error) &&
      input.allowShorter !== false &&
      input.source.trim().length > 2_500 &&
      Date.now() + 22_000 < deadline
    ) {
      return generateMindmapSlice({
        ...input,
        source: shorterStudySource(input.source),
        allowShorter: false,
        timeoutMs: 20_000,
        sectionNote: `${input.sectionNote ?? ""} The previous attempt ran long. Cover only this shorter cut.`.trim(),
      });
    }
    if (
      !isGenerateTimeout(error) &&
      !/No object generated|NoObjectGenerated/i.test(`${name} ${message}`)
    ) {
      throw error;
    }
    return { mindmap: mindmapDespiteTimeout(input.source), usage: { inputTokens: 0, outputTokens: 0 } };
  }
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
  requirements?: string;
}): Promise<{ mindmap: MindmapPayload; usage: StudioUsage }> {
  const depth = input.depth ?? "basic";
  const purpose = input.purpose ?? "starter";
  const sections = studioSourceSections(input.source, depth, depth === "detailed" ? 6_000 : 4_000);
  const timeoutMs = 45_000;
  const deadlineMs = Date.now() + 110_000;
  const parts: MindmapPayload[] = [];
  let usage: StudioUsage = { inputTokens: 0, outputTokens: 0 };
  for (const [index, section] of sections.entries()) {
    const generated = await generateMindmapSlice({
      ...input,
      source: section,
      depth,
      purpose,
      timeoutMs,
      deadlineMs,
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

const childrenSchema = z.object({
  children: z
    .array(z.object({ label: z.string().min(1).max(80) }))
    .min(2)
    .max(8),
});

export async function generateMindmapChildren(input: {
  source: string;
  nodeLabel: string;
  parentLabel?: string | null;
  siblingLabels: string[];
  mode: "expand" | "rebranch";
  language?: string;
  model?: string;
  provider?: LLMProvider;
}): Promise<{ labels: string[]; usage: StudioUsage }> {
  const snippet = input.source.trim().slice(0, 4_000);
  const modeLine =
    input.mode === "rebranch"
      ? "Replace the branches under this node. Cover the same idea with a clearer split. Do not repeat the node label."
      : "Add new child nodes under this node. Do not repeat existing sibling labels. Facts only from the source.";
  const prompt = `Grow a study mind map from this source.
${studioLanguageRules(input.language ?? "en")}
${mindmapLabelRules(input.language ?? "en")}
Node: ${input.nodeLabel}
${input.parentLabel ? `Parent: ${input.parentLabel}` : ""}
Existing children: ${input.siblingLabels.join("; ") || "(none)"}
${modeLine}
Return 3–6 short child labels. One idea each. No invented facts.

Source:
${snippet}`;
  if (input.provider === "ollama") {
    const parsed = childrenSchema.parse(await ollamaGenerateJson(prompt));
    return {
      labels: parsed.children.map((child) => child.label.trim()).filter(Boolean),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
  const result = await generateObjectWithRetry(() =>
    generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: childrenSchema,
      abortSignal: AbortSignal.timeout(40_000),
      maxRetries: 0,
      prompt,
    }),
  );
  return {
    labels: result.object.children.map((child) => child.label.trim()).filter(Boolean),
    usage: readUsage(result),
  };
}
