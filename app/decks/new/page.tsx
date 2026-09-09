import { getTranslations } from "next-intl/server";

import { CreateDeckForm } from "@/components/create-deck-form";
import { Button } from "@/components/ui/button";
import { createSampleDeckAction } from "@/lib/actions/decks";
import { requireSession } from "@/lib/auth-server";
import { getOrRefreshCredits } from "@/lib/data/credits";
import { env } from "@/lib/env";
import { getConfiguredProviders } from "@/lib/llm/config";
import { listOpenRouterFreeModels } from "@/lib/llm/openrouter-models";

export default async function NewDeckPage() {
  const session = await requireSession();
  const providers = getConfiguredProviders();
  const canUpload = Boolean(env.supabaseSecretKey);
  let credits;
  try {
    credits = await getOrRefreshCredits(session.user.id);
  } catch {
    return (
      <main className="page-shell max-w-3xl">
        <p className="eyebrow">Create</p>
        <h1 className="page-title">Library is waking up</h1>
        <p className="page-subtitle">
          Your account is fine. The study database was offline. Wait a minute,
          then try generating a deck again.
        </p>
      </main>
    );
  }
  const freeModels = providers.includes("openrouter")
    ? await listOpenRouterFreeModels()
    : [];
  const t = await getTranslations("create");
  const td = await getTranslations("decks");

  return (
    <main className="page-shell max-w-3xl">
      <p className="eyebrow">{td("newDeck")}</p>
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-subtitle">{t("subtitle")}</p>

      <form action={createSampleDeckAction} className="mt-8">
        <Button type="submit" variant="secondary">
          {td("sampleDeck")}
        </Button>
      </form>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <CreateDeckForm
          canUpload={canUpload}
          energyBalance={credits.balance}
          energyUnlimited={credits.isUnlimited}
          isGuest={Boolean(session.user.isGuest)}
          freeModels={freeModels}
          providers={providers}
        />
      </section>
    </main>
  );
}
