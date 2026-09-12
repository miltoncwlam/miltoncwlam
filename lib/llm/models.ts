import {
  FREE_MODEL_BILLING_RATES,
  type BillingRates,
} from "@/lib/credits/config";

export type PaidModelGroup = "budget" | "standard";

export type PaidOpenRouterModel = {
  id: string;
  group: PaidModelGroup;
  label: string;
  inputPerM: number;
  outputPerM: number;
};

export const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";
/** Notebook chat is always this slug. Never Auto, Qwen (OCR), or V4.1. */
export const CHAT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash-0731";
/** Vision model used to transcribe scanned PDF pages. */
export const DEFAULT_OCR_MODEL = "qwen/qwen3.8-flash";
export const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b";
export const DEFAULT_IMAGE_USD = 0.014;

/** Families Auto may pick in HK. OpenAI / Anthropic / Claude stay off. */
export const HK_SAFE_AUTO_MODELS = [
  "deepseek/*",
  "qwen/*",
  "google/*",
  "nvidia/*",
  "meta-llama/*",
  "mistralai/*",
  "moonshotai/*",
  "z-ai/*",
  "minimax/*",
];

export function isOpenRouterAutoModel(modelId: string) {
  const id = modelId.trim().toLowerCase();
  return id === "openrouter/auto" || id === "openrouter/auto-beta";
}

/** Auto has no list price; bill estimates at DeepSeek 0731 as a floor. */
export function withOpenRouterAutoRouting(body: Record<string, unknown>) {
  if (!isOpenRouterAutoModel(String(body.model ?? ""))) return body;
  return {
    ...body,
    plugins: [
      {
        id: "auto-router",
        cost_tier: "low",
        allowed_models: HK_SAFE_AUTO_MODELS,
      },
    ],
  };
}

export function withOpenRouterAutoFetchInit(
  init?: RequestInit,
): RequestInit | undefined {
  if (!init?.body || typeof init.body !== "string") return init;
  try {
    const parsed = JSON.parse(init.body) as Record<string, unknown>;
    const next = withOpenRouterAutoRouting(parsed);
    if (next === parsed) return init;
    return { ...init, body: JSON.stringify(next) };
  } catch {
    return init;
  }
}

export const PAID_OPENROUTER_MODELS: PaidOpenRouterModel[] = [
  {
    id: "openrouter/auto",
    group: "budget",
    label: "Auto",
    inputPerM: 0.05,
    outputPerM: 0.16,
  },
  {
    id: "deepseek/deepseek-v4-flash-0731",
    group: "budget",
    label: "DeepSeek V4 Flash",
    inputPerM: 0.05,
    outputPerM: 0.16,
  },
  {
    id: "qwen/qwen3.8-flash",
    group: "standard",
    label: "Qwen 3.8 Flash",
    inputPerM: 0.15,
    outputPerM: 0.47,
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    group: "standard",
    label: "DeepSeek V4.1 Flash",
    inputPerM: 0.15,
    outputPerM: 0.6,
  },
];

/** Notebooks created before 3.9.3 still bill at the old OpenRouter list prices. */
const LEGACY_PAID_OPENROUTER_RATES: PaidOpenRouterModel[] = [
  {
    id: "deepseek/deepseek-v4-flash",
    group: "budget",
    label: "DeepSeek V4 Flash",
    inputPerM: 0.08,
    outputPerM: 0.25,
  },
  {
    id: "qwen/qwen3.7-flash",
    group: "standard",
    label: "Qwen 3.7 Flash",
    inputPerM: 0.03,
    outputPerM: 0.13,
  },
];

const PAID_BY_ID = new Map(
  [...PAID_OPENROUTER_MODELS, ...LEGACY_PAID_OPENROUTER_RATES].map((model) => [
    model.id,
    model,
  ]),
);

export function isPaidOpenRouterModel(modelId: string): boolean {
  return PAID_BY_ID.has(modelId);
}

export function getPaidOpenRouterModel(
  modelId: string,
): PaidOpenRouterModel | undefined {
  return PAID_BY_ID.get(modelId);
}

export function resolveBillingRates(input: {
  provider: "openrouter" | "ollama";
  modelId: string;
}): BillingRates {
  if (input.provider === "ollama") {
    return { inputPerM: 0, outputPerM: 0 };
  }
  const paid = getPaidOpenRouterModel(input.modelId);
  if (paid) {
    return { inputPerM: paid.inputPerM, outputPerM: paid.outputPerM };
  }

  return { ...FREE_MODEL_BILLING_RATES };
}
