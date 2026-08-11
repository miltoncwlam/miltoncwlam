"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import type { AuthProvider } from "@/lib/types/auth";

function BetterAuthSignOutButton() {
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <button
      className="text-button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      type="button"
    >
      {t("signOut")}
    </button>
  );
}

function ClerkSignOutButton() {
  const router = useRouter();
  const t = useTranslations("nav");
  const { signOut } = useClerk();

  return (
    <button
      className="text-button"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      type="button"
    >
      {t("signOut")}
    </button>
  );
}

export function SignOutButton({
  provider,
  clerkEnabled,
}: {
  provider?: AuthProvider;
  clerkEnabled?: boolean;
}) {
  if (provider === "clerk" && clerkEnabled) {
    return <ClerkSignOutButton />;
  }
  return <BetterAuthSignOutButton />;
}
