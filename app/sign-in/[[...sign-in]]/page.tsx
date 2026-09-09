import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ClerkSignInPanel } from "@/components/clerk-auth-panel";
import { safeAppPath } from "@/lib/app-url";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeAppPath(params.redirect_url ?? params.next);
  const { userId } = await auth();
  if (userId) redirect(redirectTo);

  return (
    <main className="auth-stage">
      <div className="auth-stage-glow" aria-hidden />
      <div className="auth-stage-grid">
        <section className="auth-stage-copy">
          <p className="landing-kicker">Welcome back</p>
          <p className="landing-brand">HK Study A</p>
          <h1 className="auth-stage-title">Sign in to your library</h1>
          <p className="auth-stage-subtitle">
            Email and password, or try a short guest trial first.
          </p>
        </section>
        <div className="auth-stage-card">
          <ClerkSignInPanel redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  );
}
