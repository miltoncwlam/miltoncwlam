import { getTranslations } from "next-intl/server";

import { AuthForm } from "@/components/auth-form";
import { ClerkSignInPanel } from "@/components/clerk-auth-panel";
import { clerkAuthConfigured } from "@/lib/auth-server";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations("auth");
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/decks";
  const clerkEnabled = clerkAuthConfigured();

  return (
    <main className="page-shell flex max-w-md flex-col items-center">
      <p className="eyebrow">{t("signInEyebrow")}</p>
      <h1 className="page-title text-4xl sm:text-5xl">{t("signInTitle")}</h1>
      <p className="page-subtitle text-center">{t("signInSubtitle")}</p>

      {clerkEnabled ? (
        <section className="mt-8 w-full max-w-sm space-y-6">
          <div>
            <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
              Clerk
            </p>
            <ClerkSignInPanel />
          </div>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or email / passkey
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <AuthForm mode="sign-in" nextPath={nextPath} />
        </section>
      ) : (
        <AuthForm mode="sign-in" nextPath={nextPath} />
      )}

      {!clerkEnabled ? (
        <p className="mt-6 text-center text-xs text-slate-500">
          Add Clerk keys to <code className="text-slate-700">.env.local</code> to
          enable social sign-in alongside Better Auth.
        </p>
      ) : null}
    </main>
  );
}
