import "server-only";

import { generateObject } from "ai";
import { z } from "zod";

import { env } from "@/lib/env";
import { getOpenRouterClient } from "@/lib/llm/config";
import {
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_CATALOG_ROUTER,
  displayOpenRouterModelName,
  isPaidOpenRouterModel,
} from "@/lib/llm/models";

export type OpenRouterCatalogModel = {
  id: string;
  name: string;
  group: "catalog";
};

type OpenRouterModelsResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    pricing?: {
      prompt?: string | number;
      completion?: string | number;
    };
    supported_parameters?: string[];
  }>;
};

/** Slugs that break generateObject even when listed on OpenRouter. */
export const DEFAULT_OPENROUTER_FREE_BLOCKLIST = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "liquid/lfm-2.5-2.6b:free",
] as const;

/** Last live probe of $0 models that returned structured JSON (no OpenAI). */
export const SEED_VERIFIED_FREE_MODELS = [
  OPENROUTER_CATALOG_ROUTER,
  "nex-agi/nex-n2.5-mini:free",
  "nex-agi/nex-n2.5-pro:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

const probeSchema = z.object({
  title: z.string().min(1).max(40),
  cards: z
    .array(
      z.object({
        front: z.string().min(1).max(80),
        back: z.string().min(1).max(80),
      }),
    )
    .length(1),
});

/** OpenAI and Anthropic on OpenRouter are region-blocked in HK. */
export function isHkBlockedProvider(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.startsWith("openai/") ||
    id.startsWith("anthropic/") ||
    id.includes("claude")
  );
}

type CacheEntry = {
  models: OpenRouterCatalogModel[];
  fetchedAt: number;
};

const CACHE_MS = 15 * 60 * 1000;
const VERIFY_MS = 6 * 60 * 60 * 1000;
let cache: CacheEntry | null = null;
let verifiedIds: Set<string> | null = null;
const failedIds = new Set<string>(DEFAULT_OPENROUTER_FREE_BLOCKLIST);
const probedAt = new Map<string, number>();
let verifying = false;

function isListedFreeModel(id: string) {
  const slug = id.trim().toLowerCase();
  return slug === OPENROUTER_CATALOG_ROUTER || slug.endsWith(":free");
}

function blocklist(): Set<string> {
  const raw = env.OPENROUTER_FREE_MODEL_BLOCKLIST ?? "";
  const fromEnv = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_OPENROUTER_FREE_BLOCKLIST, ...fromEnv]);
}

function seedVerified(): Set<string> {
  return new Set(SEED_VERIFIED_FREE_MODELS);
}

async function probeCatalogModel(modelId: string): Promise<boolean> {
  try {
    const result = await generateObject({
      model: getOpenRouterClient()(modelId),
      schema: probeSchema,
      abortSignal: AbortSignal.timeout(20_000),
      prompt:
        "Return exactly 1 educational flashcard about water. JSON only: title and cards[{front,back}].",
    });
    const card = result.object.cards[0];
    return Boolean(card?.front?.trim() && card?.back?.trim());
  } catch {
    return false;
  }
}

function applyVerifiedFilter(
  models: OpenRouterCatalogModel[],
): OpenRouterCatalogModel[] {
  const allowed = verifiedIds ?? seedVerified();
  return [...models].sort((left, right) => {
    const leftGood = allowed.has(left.id) ? 0 : 1;
    const rightGood = allowed.has(right.id) ? 0 : 1;
    return leftGood - rightGood;
  });
}

function verifyCatalogInBackground(models: OpenRouterCatalogModel[]): void {
  if (verifying) return;
  verifying = true;
  void (async () => {
    const now = Date.now();
    const knownGood = verifiedIds ?? seedVerified();
    const nextVerified = new Set<string>();

    for (const model of models) {
      const lastProbe = probedAt.get(model.id) ?? 0;
      const fresh = lastProbe > 0 && now - lastProbe < VERIFY_MS;
      if (fresh) {
        if (knownGood.has(model.id) && !failedIds.has(model.id)) {
          nextVerified.add(model.id);
        }
        continue;
      }

      const ok = await probeCatalogModel(model.id);
      probedAt.set(model.id, now);
      if (ok) {
        failedIds.delete(model.id);
        nextVerified.add(model.id);
      } else {
        failedIds.add(model.id);
      }
    }

    verifiedIds = nextVerified;
    cache = { models: applyVerifiedFilter(models), fetchedAt: Date.now() };
  })()
    .catch(() => undefined)
    .finally(() => {
      verifying = false;
    });
}

export async function listOpenRouterFreeModels(): Promise<
  OpenRouterCatalogModel[]
> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.models;
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "HK Study A",
      },
    });
    if (!response.ok) {
      return cache?.models ?? [];
    }

    const payload = (await response.json()) as OpenRouterModelsResponse;
    const blocked = blocklist();
    const models = (payload.data ?? [])
      .filter((entry) => {
        const id = entry.id?.trim();
        if (!id || blocked.has(id) || isPaidOpenRouterModel(id)) return false;
        if (isHkBlockedProvider(id)) return false;
        return isListedFreeModel(id);
      })
      .map((entry) => {
        const id = entry.id!.trim();
        return {
          id,
          name: displayOpenRouterModelName(entry.name ?? id, id),
          group: "catalog" as const,
        };
      });

    verifyCatalogInBackground(models);
    const visible = applyVerifiedFilter(models);
    cache = { models: visible, fetchedAt: Date.now() };
    return visible;
  } catch {
    return cache?.models ?? [];
  }
}

export async function isOpenRouterFreeModel(modelId: string): Promise<boolean> {
  if (isPaidOpenRouterModel(modelId)) return false;
  const catalog = await listOpenRouterFreeModels();
  return catalog.some((model) => model.id === modelId);
}

export async function resolveOpenRouterModerationModel(): Promise<string> {
  const catalog = await listOpenRouterFreeModels();
  if (catalog[0]?.id) return catalog[0].id;
  return DEFAULT_OPENROUTER_MODEL;
}

/** Let OpenRouter rotate listed models. Never pin a :free slug. */
export async function resolveOpenRouterFreeModel(): Promise<string | null> {
  return env.OPENROUTER_API_KEY ? OPENROUTER_CATALOG_ROUTER : null;
}
