import "server-only";

import { env } from "@/lib/env";
import type { LLMProvider, OllamaModelId } from "@/lib/types/flashcard";
import { OLLAMA_MODELS } from "@/lib/types/flashcard";

export type LLMConfig = {
  defaultProvider: LLMProvider;
  openai: { apiKey?: string; model: string };
  anthropic: { apiKey?: string; model: string };
  google: { apiKey?: string; model: string };
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
    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
    },
    google: {
      apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: env.GOOGLE_MODEL,
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

export function getConfiguredProviders(): LLMProvider[] {
  const config = getLLMConfig();
  const providers: LLMProvider[] = [];

  if (config.openai.apiKey) providers.push("openai");
  if (config.anthropic.apiKey) providers.push("anthropic");
  if (config.google.apiKey) providers.push("google");
  if (config.ollama.enabled) providers.push("ollama");

  return providers;
}

export function assertLLMReady(provider?: LLMProvider): LLMProvider {
  const config = getLLMConfig();
  const selected = provider ?? config.defaultProvider;

  if (selected === "ollama") {
    if (!config.ollama.enabled) {
      throw new Error(
        'Ollama is not enabled. Set OLLAMA_ENABLED=true in .env.local and run `ollama pull gemma4:e4b` (or gemma4:e2b).',
      );
    }
    return selected;
  }

  const key = config[selected].apiKey;
  if (!key) {
    throw new Error(
      `Missing API key for LLM provider "${selected}". Add it to .env.local, or enable Ollama with OLLAMA_ENABLED=true.`,
    );
  }

  return selected;
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
