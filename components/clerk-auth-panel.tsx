"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

import { GuestSignInButton } from "@/components/guest-sign-in-button";

export function ClerkSignInPanel({ redirectTo = "/decks" }: { redirectTo?: string }) {
  return (
    <div className="clerk-auth-panel w-full">
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
      <div className="mt-6 border-t border-slate-200 pt-4">
        <GuestSignInButton
          className="secondary-button w-full"
          label="Try as guest"
          redirectTo={redirectTo}
        />
      </div>
    </div>
  );
}

export function ClerkSignUpPanel({ redirectTo = "/decks" }: { redirectTo?: string }) {
  return (
    <div className="clerk-auth-panel w-full">
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
