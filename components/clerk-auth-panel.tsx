"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

export function ClerkSignInPanel() {
  return (
    <div className="clerk-auth-panel w-full">
      <SignIn
        fallbackRedirectUrl="/decks"
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </div>
  );
}

export function ClerkSignUpPanel() {
  return (
    <div className="clerk-auth-panel w-full">
      <SignUp
        fallbackRedirectUrl="/decks"
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </div>
  );
}
