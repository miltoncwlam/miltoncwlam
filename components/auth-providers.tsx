"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ComponentProps, ReactNode } from "react";

import { useTheme } from "@/components/theme-provider";

type ClerkAppearance = NonNullable<
  ComponentProps<typeof ClerkProvider>["appearance"]
>;

function clerkAppearance(theme: "light" | "dark"): ClerkAppearance {
  const dark = theme === "dark";
  return {
    variables: {
      colorPrimary: dark ? "#9ec9b4" : "#6f9f8a",
      colorBackground: dark ? "#1c1f1e" : "#fffcf7",
      colorInputBackground: dark ? "#252927" : "#fffcf7",
      colorInputText: dark ? "#f3f0e8" : "#1c1f1e",
      colorText: dark ? "#f3f0e8" : "#1c1f1e",
      colorTextSecondary: dark ? "#a8b0ac" : "#5c6562",
      colorTextOnPrimaryBackground: "#14201b",
      colorNeutral: dark ? "#d8d4cb" : "#1c1f1e",
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

export function AuthProviders({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <ClerkProvider appearance={clerkAppearance(theme)}>
      {children}
    </ClerkProvider>
  );
}
