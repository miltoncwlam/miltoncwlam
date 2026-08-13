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

export const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";
export const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b";
export const DEFAULT_IMAGE_USD = 0.014;

export const PAID_OPENROUTER_MODELS: PaidOpenRouterModel[] = [
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
  PAID_OPENROUTER_MODELS.map((model) => [model.id, model]),
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
  provider: "openrouter";
  modelId: string;
}): BillingRates {
  const paid = getPaidOpenRouterModel(input.modelId);
  if (paid) {
    return { inputPerM: paid.inputPerM, outputPerM: paid.outputPerM };
  }

  return { ...FREE_MODEL_BILLING_RATES };
}
