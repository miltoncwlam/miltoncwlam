import { generateObject } from "ai";

import { promptLanguageName } from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { notesSchema, parseNotesPayload } from "@/lib/llm/parse-studio";
import type { NotesPayload } from "@/lib/types/notebook";

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

export async function generateNotes(input: {
  source: string;
  language?: string;
  model?: string;
}): Promise<{ notes: NotesPayload; usage: StudioUsage }> {
  const language = promptLanguageName(input.language ?? "en");
  const result = await generateObject({
    model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
    schema: notesSchema,
    abortSignal: AbortSignal.timeout(45_000),
    prompt: `Write clear study notes in ${language} from this source.
Use markdown: # title, ## headings, bullet lists, and short examples.
Cover key terms, facts, and how to remember them. No invented facts.
Do not mention that you are an AI.

Source:
${input.source.slice(0, 24_000)}`,
  });
  return {
    notes: parseNotesPayload(result.object),
    usage: readUsage(result),
  };
}
