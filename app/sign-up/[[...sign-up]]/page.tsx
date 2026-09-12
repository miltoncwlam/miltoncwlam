import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ClerkSignUpPanel } from "@/components/clerk-auth-panel";
import { LocalDevEnterButton } from "@/components/landing-auth-cta";
import { safeAppPath } from "@/lib/app-url";
import { isLocalAppHost } from "@/lib/auth-local";
import { getSession } from "@/lib/auth-server";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeAppPath(params.redirect_url ?? params.next);
  const session = await getSession();
  if (session?.user.isGuest) redirect("/account?upgrade=1");
  if (session) redirect(redirectTo);

  const localDev = isLocalAppHost((await headers()).get("host"));

  return (
    <main className="auth-stage">
      <div className="auth-stage-glow" aria-hidden />
      <div className="auth-stage-grid">
        <section className="auth-stage-copy">
          <p className="landing-kicker">New account</p>
          <p className="landing-brand">HK Study A</p>
          <h1 className="auth-stage-title">
            {localDev ? "Test on localhost" : "Create your study space"}
          </h1>
          <p className="auth-stage-subtitle">
            {localDev
              ? "Clerk is off here. Continue as a local learner so you can test create and notebooks."
              : "Use email and a password. You can generate decks as soon as you are in."}
          </p>
        </section>
        <div className="auth-stage-card">
          {localDev ? (
            <LocalDevEnterButton
              className="primary-button w-full"
              label="Continue on localhost"
              redirectTo={redirectTo === "/decks" ? "/decks/new" : redirectTo}
            />
          ) : (
            <ClerkSignUpPanel redirectTo={redirectTo} />
          )}
        </div>
      </div>
    </main>
  );
}
