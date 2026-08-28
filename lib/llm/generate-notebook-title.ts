import { generateObject } from "ai";

import { promptLanguageName } from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { notebookTitleSchema } from "@/lib/llm/parse-studio";

function readUsage(result: {
  usage?: {
    inputTokens?: { total?: number } | number;
    outputTokens?: { total?: number } | number;
  };
}) {
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

export async function generateNotebookTitle(input: {
  source: string;
  language?: string;
  model?: string;
  fallback?: string;
}) {
  const language = promptLanguageName(input.language ?? "en");
  const fallback = input.fallback?.trim() || "Study notebook";
  try {
    const result = await generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: notebookTitleSchema,
      abortSignal: AbortSignal.timeout(20_000),
      prompt: `Write a short study-notebook title (max 8 words) in ${language}.
Optional one-sentence summary of what the source is about.
Source:
${input.source.slice(0, 6_000)}`,
    });
    return {
      title: result.object.title.trim() || fallback,
      summary: result.object.summary?.trim() || "",
      usage: readUsage(result),
    };
  } catch {
    return { title: fallback.slice(0, 100), summary: "", usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
