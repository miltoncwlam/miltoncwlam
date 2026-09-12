"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useToast } from "@/components/toast-provider";
import { Textarea } from "@/components/ui/textarea";
import { reportBetaEvent } from "@/lib/beta-client";

export function BetaFeedback() {
  const t = useTranslations("landing");
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"comment" | "bug">("comment");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    try {
      const response = await reportBetaEvent({ kind, message });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not send that.");
      }
      setMessage("");
      setOpen(false);
      pushToast(t("betaThanks"));
    } catch (caught) {
      pushToast(
        caught instanceof Error ? caught.message : t("betaSendError"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="beta-feedback">
      {open ? (
        <form
          className="beta-feedback-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <p className="landing-kicker">{t("betaFeedback")}</p>
          <div className="mt-3 flex gap-2">
            <button
              className={kind === "comment" ? "primary-button" : "secondary-button"}
              onClick={() => setKind("comment")}
              type="button"
            >
              {t("betaComment")}
            </button>
            <button
              className={kind === "bug" ? "primary-button" : "secondary-button"}
              onClick={() => setKind("bug")}
              type="button"
            >
              {t("betaBug")}
            </button>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">{t("betaPlaceholder")}</span>
            <Textarea
              maxLength={4000}
              minLength={8}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("betaPlaceholder")}
              required
              rows={5}
              value={message}
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              className="text-button"
              onClick={() => setOpen(false)}
              type="button"
            >
              {t("betaClose")}
            </button>
            <button className="primary-button" disabled={pending} type="submit">
              {pending ? t("betaSending") : t("betaSend")}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="beta-feedback-toggle"
          onClick={() => setOpen(true)}
          type="button"
        >
          {t("betaFeedback")}
        </button>
      )}
    </div>
  );
}
