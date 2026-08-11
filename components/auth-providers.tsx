"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function AuthProviders({
  children,
  clerkEnabled,
}: {
  children: ReactNode;
  clerkEnabled: boolean;
}) {
  if (!clerkEnabled) {
    return children;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
