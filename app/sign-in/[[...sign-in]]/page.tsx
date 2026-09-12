import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ClerkSignInPanel } from "@/components/clerk-auth-panel";
import { LocalDevEnterButton } from "@/components/landing-auth-cta";
import { safeAppPath } from "@/lib/app-url";
import { isLocalAppHost } from "@/lib/auth-local";
import { getSession } from "@/lib/auth-server";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeAppPath(params.redirect_url ?? params.next);
  const session = await getSession();
  if (session) redirect(redirectTo);

  const localDev = isLocalAppHost((await headers()).get("host"));

  return (
    <main className="auth-stage">
      <div className="auth-stage-glow" aria-hidden />
      <div className="auth-stage-grid">
        <section className="auth-stage-copy">
          <p className="landing-kicker">Welcome back</p>
          <p className="landing-brand">HK Study A</p>
          <h1 className="auth-stage-title">
            {localDev ? "Test on localhost" : "Sign in to your library"}
          </h1>
          <p className="auth-stage-subtitle">
            {localDev
              ? "Clerk is off here. Continue as a local learner — no guest quota, no clerk-js."
              : "Email and password, or try a short guest trial first."}
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
            <ClerkSignInPanel redirectTo={redirectTo} />
          )}
        </div>
      </div>
    </main>
  );
}
