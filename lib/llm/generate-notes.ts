import { generateObject } from "ai";

import { notesSectionHeadings, studioLanguageRules } from "@/lib/i18n/locales";
import {
  getOpenRouterClient,
  resolveOpenRouterModel,
} from "@/lib/llm/config";
import { generateObjectWithRetry } from "@/lib/llm/generate-object-retry";
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
  const headings = notesSectionHeadings(input.language ?? "en");
  const result = await generateObjectWithRetry(() =>
    generateObject({
      model: getOpenRouterClient()(resolveOpenRouterModel(input.model)),
      schema: notesSchema,
      abortSignal: AbortSignal.timeout(150_000),
      prompt: `Write revision-sheet study notes from this source.
${studioLanguageRules(input.language ?? "en")}
Put the title only in the title field. Do not start markdown with a duplicate # title.
The markdown field MUST use real newline characters (not a single paragraph).
Required sections, each starting on its own line with these exact headings:
## ${headings.terms}
## ${headings.facts}
## ${headings.remember}
Use "- " bullets under each heading. One bullet per line. Bold a term with **term** then its meaning on the same bullet.
Never glue headings or bullets into one paragraph. Never use the English labels Key terms / Facts / How to remember unless the output language is English.
Write enough to study from. No invented facts. No Punycode (xn--). Do not mention that you are an AI.

Source:
${input.source.slice(0, 24_000)}`,
    }),
  );
  return {
    notes: parseNotesPayload(result.object),
    usage: readUsage(result),
  };
}
