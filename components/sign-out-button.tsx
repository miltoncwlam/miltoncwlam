"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import type { AuthProvider } from "@/lib/types/auth";

function BetterAuthSignOutButton() {
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <Button
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      type="button"
      variant="ghost"
    >
      {t("signOut")}
    </Button>
  );
}

function ClerkSignOutButton() {
  const router = useRouter();
  const t = useTranslations("nav");
  const { signOut } = useClerk();

  return (
    <Button
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
      type="button"
      variant="ghost"
    >
      {t("signOut")}
    </Button>
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
