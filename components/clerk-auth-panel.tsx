"use client";

import { SignIn, SignUp } from "@clerk/nextjs";

export function ClerkSignInPanel() {
  return (
    <div className="clerk-auth-panel w-full">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto w-full",
            card: "shadow-none border-2 border-[#16324f] rounded-3xl bg-white",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
      />
    </div>
  );
}

export function ClerkSignUpPanel() {
  return (
    <div className="clerk-auth-panel w-full">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto w-full",
            card: "shadow-none border-2 border-[#16324f] rounded-3xl bg-white",
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
      />
    </div>
  );
}
