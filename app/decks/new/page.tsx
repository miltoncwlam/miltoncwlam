import { getTranslations } from "next-intl/server";

import { CreateDeckForm } from "@/components/create-deck-form";
import { createSampleDeckAction } from "@/lib/actions/decks";
import { requireSession } from "@/lib/auth-server";
import { env } from "@/lib/env";
import { getConfiguredProviders } from "@/lib/llm/config";

export default async function NewDeckPage() {
  await requireSession();
  const providers = getConfiguredProviders();
  const canUpload = Boolean(env.supabaseSecretKey);
  const t = await getTranslations("create");
  const td = await getTranslations("decks");

  return (
    <main className="page-shell max-w-3xl">
      <p className="eyebrow">{td("newDeck")}</p>
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-subtitle">{t("subtitle")}</p>

      <form action={createSampleDeckAction} className="mt-8">
        <button className="secondary-button" type="submit">
          {td("sampleDeck")}
        </button>
      </form>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <CreateDeckForm canUpload={canUpload} providers={providers} />
      </section>
    </main>
  );
}
