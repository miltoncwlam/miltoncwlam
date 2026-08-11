import { getTranslations } from "next-intl/server";

import { AuthForm } from "@/components/auth-form";
import { ClerkSignUpPanel } from "@/components/clerk-auth-panel";
import { clerkAuthConfigured } from "@/lib/auth-server";

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  const clerkEnabled = clerkAuthConfigured();

  return (
    <main className="page-shell flex max-w-md flex-col items-center">
      <p className="eyebrow">{t("signUpEyebrow")}</p>
      <h1 className="page-title text-4xl sm:text-5xl">{t("signUpTitle")}</h1>
      <p className="page-subtitle text-center">{t("signUpSubtitle")}</p>

      {clerkEnabled ? (
        <section className="mt-8 w-full max-w-sm space-y-6">
          <div>
            <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
              Clerk
            </p>
            <ClerkSignUpPanel />
          </div>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or email / passkey
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <AuthForm mode="sign-up" />
        </section>
      ) : (
        <AuthForm mode="sign-up" />
      )}
    </main>
  );
}
