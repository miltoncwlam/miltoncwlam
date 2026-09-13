import { requireApiSession } from "@/lib/auth-server";
import { isFreeModelCampaignActive } from "@/lib/campaign";
import { getConfiguredProviders } from "@/lib/llm/config";
import {
  OPENROUTER_CATALOG_ROUTER,
  PAID_OPENROUTER_MODELS,
} from "@/lib/llm/models";
import { listOpenRouterImageModels } from "@/lib/llm/openrouter-image-models";

export async function GET() {
  await requireApiSession();
  const providers = getConfiguredProviders();
  const imageModels = providers.includes("openrouter")
    ? await listOpenRouterImageModels()
    : [];
  const campaign =
    isFreeModelCampaignActive() && providers.includes("openrouter");

  return Response.json({
    providers,
    paid: PAID_OPENROUTER_MODELS,
    free: campaign
      ? [
          {
            id: OPENROUTER_CATALOG_ROUTER,
            name: "60% energy",
            group: "catalog",
          },
        ]
      : [],
    imageModels,
  });
}
