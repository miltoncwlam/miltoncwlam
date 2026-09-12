import { env } from "@/lib/env";
import { extractJsonObject } from "@/lib/llm/parse-deck-json";
import { isOllamaAvailable } from "@/lib/types/flashcard";

export { isOllamaAvailable };

export function isOllamaConfigured() {
  return isOllamaAvailable({
    baseUrl: env.OLLAMA_BASE_URL,
    vercel: process.env.VERCEL,
  });
}

export function ollamaModelId(requested?: string | null) {
  const trimmed = requested?.trim();
  if (trimmed && !trimmed.includes("/")) return trimmed;
  return env.OLLAMA_MODEL?.trim() || "gemma3:4b";
}

export async function ollamaGenerateJson(prompt: string): Promise<unknown> {
  const base = env.OLLAMA_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Ollama is not configured. Set OLLAMA_BASE_URL in .env.local.");
  const model = ollamaModelId();
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [{ role: "user", content: `${prompt}\nReply with JSON only.` }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama ${response.status}`);
  }
  const payload = (await response.json()) as { message?: { content?: string } };
  return extractJsonObject(payload.message?.content ?? "");
}
