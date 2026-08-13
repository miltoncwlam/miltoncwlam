import "server-only";

import { env } from "@/lib/env";
import { DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_USD } from "@/lib/llm/models";

export type ImageModelGroup = "catalog" | "budget" | "standard";

export type OpenRouterImageModel = {
  id: string;
  name: string;
  group: ImageModelGroup;
  usdPerImage: number;
};

type CacheEntry = {
  models: OpenRouterImageModel[];
  fetchedAt: number;
};

const CACHE_MS = 15 * 60 * 1000;
let cache: CacheEntry | null = null;

export { DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_USD };

const STARTER_IMAGE_MODELS: OpenRouterImageModel[] = [
  {
    id: "black-forest-labs/flux.2-klein-4b",
    name: "FLUX.2 Klein",
    group: "catalog",
    usdPerImage: 0.014,
  },
  {
    id: "qwen/qwen-image-3",
    name: "Qwen Image 3",
    group: "budget",
    usdPerImage: 0.03,
  },
  {
    id: "bytedance-seed/seedream-4.5",
    name: "Seedream 4.5",
    group: "standard",
    usdPerImage: 0.04,
  },
];

type EndpointsResponse = {
  endpoints?: Array<{
    pricing?: Array<{
      billable?: string;
      unit?: string;
      cost_usd?: number;
    }>;
  }>;
};

function isHkBlockedImageModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.startsWith("openai/") ||
    id.startsWith("anthropic/") ||
    id.includes("claude")
  );
}

function groupForUsd(usd: number): ImageModelGroup {
  if (usd <= 0.02) return "catalog";
  if (usd <= 0.035) return "budget";
  return "standard";
}

function cheapestOutputUsd(payload: EndpointsResponse): number | null {
  const costs = (payload.endpoints ?? []).flatMap((endpoint) =>
    (endpoint.pricing ?? [])
      .filter(
        (row) =>
          row.billable === "output_image" &&
          (row.unit === "image" || row.unit === "megapixel") &&
          typeof row.cost_usd === "number" &&
          row.cost_usd > 0,
      )
      .map((row) => row.cost_usd as number),
  );
  if (!costs.length) return null;
  return Math.min(...costs);
}

async function fetchOutputUsd(
  apiKey: string,
  modelId: string,
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://openrouter.ai/api/v1/images/models/${modelId}/endpoints`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
          "X-Title": "HK Study A",
        },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return null;
    return cheapestOutputUsd((await response.json()) as EndpointsResponse);
  } catch {
    return null;
  }
}

export async function listOpenRouterImageModels(): Promise<
  OpenRouterImageModel[]
> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.models;
  }

  const starters = STARTER_IMAGE_MODELS.filter(
    (model) => !isHkBlockedImageModel(model.id),
  );
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return starters;

  try {
    const priced = await Promise.all(
      starters.map(async (starter) => {
        const usd = await fetchOutputUsd(apiKey, starter.id);
        const usdPerImage = usd ?? starter.usdPerImage;
        if (usdPerImage > 0.05) return null;
        return {
          ...starter,
          usdPerImage,
          group: groupForUsd(usdPerImage),
        };
      }),
    );

    const models = priced.filter(Boolean) as OpenRouterImageModel[];
    const resolved = models.length ? models : starters;
    cache = { models: resolved, fetchedAt: Date.now() };
    return resolved;
  } catch {
    return cache?.models ?? starters;
  }
}

export async function resolveImageModelCost(modelId: string): Promise<number> {
  const models = await listOpenRouterImageModels();
  return (
    models.find((model) => model.id === modelId)?.usdPerImage ??
    DEFAULT_IMAGE_USD
  );
}
