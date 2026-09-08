import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ClerkSignUpPanel } from "@/components/clerk-auth-panel";
import { safeAppPath } from "@/lib/app-url";

export default async function SignUpPage({
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
          <p className="landing-kicker">New account</p>
          <p className="landing-brand">HK Study A</p>
          <h1 className="auth-stage-title">Create your study space</h1>
          <p className="auth-stage-subtitle">
            Use email and a password. You can generate decks as soon as you are in.
          </p>
        </section>
        <div className="auth-stage-card">
          <ClerkSignUpPanel redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  );
}
