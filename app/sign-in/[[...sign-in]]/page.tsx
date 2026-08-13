import { getTranslations } from "next-intl/server";

import { ClerkSignInPanel } from "@/components/clerk-auth-panel";

export default async function SignInPage() {
  const t = await getTranslations("auth");

  return (
    <main className="page-shell flex max-w-lg flex-col items-center">
      <p className="eyebrow">{t("signInEyebrow")}</p>
      <h1 className="page-title text-center">{t("signInTitle")}</h1>
      <p className="page-subtitle text-center">{t("signInSubtitle")}</p>
      <section className="mt-8 w-full max-w-md">
        <ClerkSignInPanel />
      </section>
    </main>
  );
}
