import { generateObject } from "ai";

import {
  mindmapLabelRules,
  studioIntentRules,
  studioLanguageRules,
  studioSourceSlice,
  type StudioDepth,
  type StudioPurpose,
} from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { generateObjectWithRetry } from "@/lib/llm/generate-object-retry";
import { mindmapSchema, parseMindmapPayload } from "@/lib/llm/parse-studio";
import type { MindmapPayload } from "@/lib/types/notebook";

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

export async function generateMindmap(input: {
  source: string;
  language?: string;
  model?: string;
  depth?: StudioDepth;
  purpose?: StudioPurpose;
}): Promise<{ mindmap: MindmapPayload; usage: StudioUsage }> {
  const depth = input.depth ?? "basic";
  const purpose = input.purpose ?? "starter";
  const result = await generateObjectWithRetry(() =>
    generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: mindmapSchema,
      abortSignal: AbortSignal.timeout(150_000),
      prompt: `Build a study mind map as a flat node list from this source.
${studioLanguageRules(input.language ?? "en")}
${mindmapLabelRules(input.language ?? "en")}
${studioIntentRules(depth, purpose, "mindmap")}
Rules:
- Exactly one root node with parentId null (the topic). ids n1, n2, n3… with no repeats.
- Main branches (parentId = root id) cover different parts of the source, not synonyms of the title.
- Leaves are facts or examples from the source. No invented facts.

Source:
${studioSourceSlice(input.source, depth)}`,
    }),
  );
  return {
    mindmap: parseMindmapPayload(result.object),
    usage: readUsage(result),
  };
}
