import "server-only";

import { createOpenAI } from "@ai-sdk/openai";

import { env } from "@/lib/env";
import { DEFAULT_OPENROUTER_MODEL, isPaidOpenRouterModel } from "@/lib/llm/models";
import type { LLMProvider } from "@/lib/types/flashcard";

export type LLMConfig = {
  defaultProvider: LLMProvider;
  openrouter: { apiKey?: string; model: string };
};

export function getLLMConfig(): LLMConfig {
  return {
    defaultProvider: "openrouter",
    openrouter: {
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    },
  };
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(getLLMConfig().openrouter.apiKey);
}

export function getConfiguredProviders(): LLMProvider[] {
  return isOpenRouterConfigured() ? ["openrouter"] : [];
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
    throw new Error("Missing OPENROUTER_API_KEY. Add it to .env.local.");
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

export function assertLLMReady(_provider?: LLMProvider): LLMProvider {
  if (!getLLMConfig().openrouter.apiKey) {
    throw new Error("Missing API key for OpenRouter. Add OPENROUTER_API_KEY to .env.local.");
  }
  return "openrouter";
}

export function isKnownPaidModel(modelId: string): boolean {
  return isPaidOpenRouterModel(modelId);
}
