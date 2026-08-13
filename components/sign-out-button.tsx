"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
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
