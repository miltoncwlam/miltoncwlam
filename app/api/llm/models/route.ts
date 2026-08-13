import { requireApiSession } from "@/lib/auth-server";
import { getConfiguredProviders } from "@/lib/llm/config";
import { PAID_OPENROUTER_MODELS } from "@/lib/llm/models";
import { listOpenRouterImageModels } from "@/lib/llm/openrouter-image-models";
import { listOpenRouterFreeModels } from "@/lib/llm/openrouter-models";
import { OLLAMA_MODELS } from "@/lib/types/flashcard";

export async function GET() {
  await requireApiSession();
  const providers = getConfiguredProviders();
  const [free, imageModels] = await Promise.all([
    providers.includes("openrouter")
      ? listOpenRouterFreeModels()
      : Promise.resolve([]),
    providers.includes("openrouter")
      ? listOpenRouterImageModels()
      : Promise.resolve([]),
  ]);

  return Response.json({
    providers,
    paid: PAID_OPENROUTER_MODELS,
    free,
    ollama: OLLAMA_MODELS,
    imageModels,
  });
}
