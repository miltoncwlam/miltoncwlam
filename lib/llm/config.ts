import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

import { env } from "@/lib/env";
import { DEFAULT_OPENROUTER_MODEL, isPaidOpenRouterModel } from "@/lib/llm/models";
import type { LLMProvider, OllamaModelId } from "@/lib/types/flashcard";
import { OLLAMA_MODELS } from "@/lib/types/flashcard";

export type LLMConfig = {
  defaultProvider: LLMProvider;
  openrouter: { apiKey?: string; model: string };
  ollama: { enabled: boolean; baseUrl: string; model: OllamaModelId };
};

const ALLOWED_OLLAMA = new Set<string>(OLLAMA_MODELS.map((entry) => entry.id));

export function resolveOllamaModel(requested?: string | null): OllamaModelId {
  if (requested && ALLOWED_OLLAMA.has(requested)) {
    return requested as OllamaModelId;
  }
  const fallback = env.OLLAMA_MODEL;
  if (ALLOWED_OLLAMA.has(fallback)) return fallback as OllamaModelId;
  return "gemma4:e4b";
}

export function getLLMConfig(): LLMConfig {
  return {
    defaultProvider: env.LLM_DEFAULT_PROVIDER,
    openrouter: {
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    },
    ollama: {
      enabled: env.OLLAMA_ENABLED,
      baseUrl: env.OLLAMA_BASE_URL.replace(/\/$/, ""),
      model: resolveOllamaModel(env.OLLAMA_MODEL),
    },
  };
}

export function isOllamaConfigured(): boolean {
  return getLLMConfig().ollama.enabled;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(getLLMConfig().openrouter.apiKey);
}

export function getConfiguredProviders(): LLMProvider[] {
  const config = getLLMConfig();
  const providers: LLMProvider[] = [];
  if (config.openrouter.apiKey) providers.push("openrouter");
  if (config.ollama.enabled) providers.push("ollama");
  return providers;
}

export function openRouterHeaders(): Record<string, string> {
  return {
    "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
    "X-Title": "FlashCard Generator",
  };
}

export function getOpenRouterClient() {
  const config = getLLMConfig();
  if (!config.openrouter.apiKey) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Add it to .env.local, or enable Ollama with OLLAMA_ENABLED=true.",
    );
  }
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openrouter.apiKey,
    name: "openrouter",
    headers: openRouterHeaders(),
  });
}

export function resolveOpenRouterModel(requested?: string | null): string {
  if (requested?.trim()) return requested.trim();
  return getLLMConfig().openrouter.model || DEFAULT_OPENROUTER_MODEL;
}

export function assertLLMReady(provider?: LLMProvider): LLMProvider {
  const config = getLLMConfig();
  const selected = provider ?? config.defaultProvider;

  if (selected === "ollama") {
    if (!config.ollama.enabled) {
      throw new Error(
        "Ollama is not enabled. Set OLLAMA_ENABLED=true in .env.local and run `ollama pull gemma4:e4b` (or gemma4:e2b).",
      );
    }
    return selected;
  }

  if (!config.openrouter.apiKey) {
    throw new Error(
      'Missing API key for OpenRouter. Add OPENROUTER_API_KEY to .env.local, or enable Ollama with OLLAMA_ENABLED=true.',
    );
  }

  return selected;
}

export function isKnownPaidOrOllamaModel(modelId: string): boolean {
  return isPaidOpenRouterModel(modelId) || ALLOWED_OLLAMA.has(modelId);
}

export async function assertOllamaReachable(modelOverride?: string): Promise<void> {
  const { baseUrl } = getLLMConfig().ollama;
  const model = resolveOllamaModel(modelOverride);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    throw new Error(
      `Cannot reach Ollama at ${baseUrl}. Start Ollama, then run: ollama pull ${model}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Ollama responded with ${response.status} at ${baseUrl}. Is the server running?`,
    );
  }

  const payload = (await response.json()) as {
    models?: Array<{ name?: string; model?: string }>;
  };
  const names = [
    ...new Set(
      (payload.models ?? []).flatMap((entry) =>
        [entry.name, entry.model].filter(Boolean) as string[],
      ),
    ),
  ];
  const found =
    names.some((name) => name === model) ||
    names.some((name) => name.startsWith(`${model}:`));

  if (!found) {
    const installed = names.length
      ? ` Installed: ${names.slice(0, 6).join(", ")}${names.length > 6 ? "…" : ""}.`
      : "";
    throw new Error(
      `Ollama model "${model}" is not installed. Run: ollama pull ${model}${installed}`,
    );
  }
}
