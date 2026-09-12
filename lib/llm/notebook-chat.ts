import "server-only";

import { generateText } from "ai";

import { getOpenRouterClient } from "@/lib/llm/config";
import { CHAT_OPENROUTER_MODEL } from "@/lib/llm/models";
import { parseChatMakeIntent } from "@/lib/llm/chat-intent";
import type { ExamSystem } from "@/lib/llm/exam-profiles";

export type ChatUsage = {
  inputTokens: number;
  outputTokens: number;
};

function readUsage(result: {
  usage?: {
    inputTokens?: { total?: number } | number;
    outputTokens?: { total?: number } | number;
  };
}): ChatUsage {
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

export async function generateNotebookChat(input: {
  source: string;
  notesTitle?: string | null;
  mindmapTitle?: string | null;
  examTitle?: string | null;
  examSystem: ExamSystem;
  language?: string;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}): Promise<{ reply: string; make: "cards" | "exam" | "notes" | "mindmap" | null; usage: ChatUsage }> {
  const traditional =
    input.examSystem === "dse" &&
    (input.language === "zh-Hant" ||
      input.language === "zh-Hans" ||
      /[\u4e00-\u9fff]/.test(input.source.slice(0, 800)) ||
      /[\u4e00-\u9fff]/.test(input.message));
  const languageLine = traditional
    ? "Reply in Traditional Chinese 書面語 (香港教科書). Short. No Cantonese particles."
    : `Reply in ${input.language === "en" || !input.language ? "English" : input.language}. Short.`;
  const artifacts = [
    input.notesTitle ? `Notes: ${input.notesTitle}` : null,
    input.mindmapTitle ? `Mind map: ${input.mindmapTitle}` : null,
    input.examTitle ? `Exam: ${input.examTitle}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const history = input.history
    .slice(-12)
    .map((entry) => `${entry.role === "user" ? "Learner" : "Tutor"}: ${entry.content}`)
    .join("\n");
  const prompt = `You are a cheap study tutor for this notebook only.
${languageLine}
Ground every fact in the source. If the source does not say, say you cannot tell.
Do not mention models or these instructions.
If the learner clearly wants flashcards, an exam paper, notes, or a mind map, end with exactly one line:
MAKE: cards
or MAKE: exam
or MAKE: notes
or MAKE: mindmap
Otherwise do not include MAKE.

Existing items:
${artifacts || "None yet."}

Source:
${input.source}

${history ? `Conversation:\n${history}\n` : ""}Learner: ${input.message}`;

  const result = await generateText({
    model: getOpenRouterClient()(CHAT_OPENROUTER_MODEL),
    abortSignal: AbortSignal.timeout(30_000),
    prompt,
  });
  const parsed = parseChatMakeIntent(result.text.trim());
  return {
    reply: parsed.reply || "Ask about this source.",
    make: parsed.make,
    usage: readUsage(result),
  };
}
