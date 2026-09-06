import { generateObject } from "ai";

import { promptLanguageName } from "@/lib/i18n/locales";
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
}): Promise<{ mindmap: MindmapPayload; usage: StudioUsage }> {
  const language = promptLanguageName(input.language ?? "en");
  const result = await generateObjectWithRetry(() =>
    generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: mindmapSchema,
      abortSignal: AbortSignal.timeout(45_000),
      prompt: `Build a study mind map in ${language} as a flat node list.
Rules:
- One root node with parentId null (the topic).
- 3–8 main branches (parentId = root id).
- Each branch can have 1–4 child leaves.
- Labels: short (2–8 words). No invented facts.
- ids like n1, n2, n3.

Source:
${input.source.slice(0, 24_000)}`,
    }),
  );
  return {
    mindmap: parseMindmapPayload(result.object),
    usage: readUsage(result),
  };
}
