"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemGiftCodeAction } from "@/lib/actions/credits";

export function GiftCodeForm({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("gift");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const fieldId = compact ? "gift-code-compact" : "gift-code";

  async function redeem() {
    const code = inputRef.current?.value ?? "";
    setPending(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("code", code);
    const result = await redeemGiftCodeAction(formData);
    setPending(false);
    if ("error" in result) {
      setOk(false);
      setMessage(
        result.error === "That gift code is not valid." ? t("invalid") : result.error,
      );
      return;
    }
    setOk(true);
    setMessage(result.already ? t("already") : t("ok"));
    router.refresh();
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "flex flex-wrap items-end gap-2" : "space-y-2"}>
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor={fieldId}>{t("label")}</Label>
          <Input
            autoComplete="off"
            disabled={pending}
            id={fieldId}
            inputMode="numeric"
            maxLength={16}
            name="giftCode"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void redeem();
              }
            }}
            placeholder={t("placeholder")}
            ref={inputRef}
          />
        </div>
        <Button
          disabled={pending}
          onClick={() => void redeem()}
          size={compact ? "sm" : "default"}
          type="button"
        >
          {t("apply")}
        </Button>
      </div>
      {compact ? null : <p className="text-xs text-slate-500">{t("hint")}</p>}
      {message ? (
        <p className={`text-sm font-medium ${ok ? "text-emerald-800" : "text-rose-800"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
