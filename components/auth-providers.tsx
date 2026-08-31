"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ComponentProps, ReactNode } from "react";

type ClerkAppearance = NonNullable<
  ComponentProps<typeof ClerkProvider>["appearance"]
>;

function clerkAppearance(theme: "light" | "dark"): ClerkAppearance {
  const dark = theme === "dark";
  return {
    variables: {
      colorPrimary: dark ? "#9ec9b4" : "#3d8b72",
      colorBackground: dark ? "#1c1f1e" : "#fffcf7",
      colorInputBackground: dark ? "#252927" : "#fffcf7",
      colorInputText: dark ? "#f3f0e8" : "#14201b",
      colorText: dark ? "#f3f0e8" : "#14201b",
      colorTextSecondary: dark ? "#a8b0ac" : "#3a4541",
      colorTextOnPrimaryBackground: "#f4fff9",
      colorNeutral: dark ? "#d8d4cb" : "#14201b",
      colorDanger: dark ? "#f87171" : "#b42318",
      borderRadius: "1.1rem",
    },
    elements: {
      card: "cl-app-card shadow-none border-2 rounded-3xl",
      footer: "cl-app-footer",
      socialButtonsIconButton: "cl-app-social",
      formFieldInput: "cl-app-input",
      headerTitle: "cl-app-title",
      headerSubtitle: "cl-app-subtitle",
      formFieldLabel: "cl-app-label",
    },
  };
}

export function AuthProviders({
  appUrl,
  children,
}: {
  appUrl: string;
  children: ReactNode;
}) {
  const afterAuth = `${appUrl.replace(/\/$/, "")}/decks`;
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      allowedRedirectOrigins={[
        "http://localhost:3000",
        "https://hkstudya.vercel.app",
        appUrl,
      ]}
      appearance={clerkAppearance("light")}
      signInFallbackRedirectUrl={afterAuth}
      signUpFallbackRedirectUrl={afterAuth}
    >
      {children}
    </ClerkProvider>
  );
}
