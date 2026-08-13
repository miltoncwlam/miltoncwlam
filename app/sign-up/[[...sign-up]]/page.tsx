import { getTranslations } from "next-intl/server";

import { ClerkSignUpPanel } from "@/components/clerk-auth-panel";

export default async function SignUpPage() {
  const t = await getTranslations("auth");

  return (
    <main className="page-shell flex max-w-lg flex-col items-center">
      <p className="eyebrow">{t("signUpEyebrow")}</p>
      <h1 className="page-title text-center">{t("signUpTitle")}</h1>
      <p className="page-subtitle text-center">{t("signUpSubtitle")}</p>
      <section className="mt-8 w-full max-w-md">
        <ClerkSignUpPanel />
      </section>
    </main>
  );
}
