"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

export function ClerkSignInPanel({ redirectTo = "/decks" }: { redirectTo?: string }) {
  return (
    <div className="clerk-auth-panel">
      <SignIn
        fallback={
          <p className="py-8 text-center text-sm text-slate-500">Loading sign-in…</p>
        }
        fallbackRedirectUrl={redirectTo}
        forceRedirectUrl={redirectTo}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </div>
  );
}

export function ClerkSignUpPanel({ redirectTo = "/decks" }: { redirectTo?: string }) {
  return (
    <div className="clerk-auth-panel">
      <SignUp
        fallback={
          <p className="py-8 text-center text-sm text-slate-500">Loading sign-up…</p>
        }
        fallbackRedirectUrl={redirectTo}
        forceRedirectUrl={redirectTo}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </div>
  );
}
