"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

async function clearLocalSession() {
  await fetch("/api/auth/guest", { method: "DELETE" });
}

function LocalSignOutButton() {
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <Button
      onClick={async () => {
        await clearLocalSession();
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
        await clearLocalSession();
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

export function SignOutButton({ localDev = false }: { localDev?: boolean }) {
  if (localDev) return <LocalSignOutButton />;
  return <ClerkSignOutButton />;
}
