"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { copyCommunityDeckAction } from "@/lib/actions/community";

export function CommunityCopyButton({ deckId }: { deckId: string }) {
  const t = useTranslations("community");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState(t("copy"));

  return (
    <button
      className="primary-button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const id = await copyCommunityDeckAction(deckId);
          setLabel(t("copied"));
          router.push(`/decks/${id}`);
        })
      }
      type="button"
    >
      {label}
    </button>
  );
}
