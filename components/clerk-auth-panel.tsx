"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

export function ClerkSignInPanel({ redirectTo = "/decks" }: { redirectTo?: string }) {
  return (
    <div className="clerk-auth-panel w-full">
      <SignIn
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
    <div className="clerk-auth-panel w-full">
      <SignUp
        fallbackRedirectUrl={redirectTo}
        forceRedirectUrl={redirectTo}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </div>
  );
}
