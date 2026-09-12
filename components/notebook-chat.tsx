"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { friendlyGenerateError } from "@/lib/friendly-generate-error";
import type { ChatMakeKind } from "@/lib/llm/chat-intent";
import type { NotebookChatMessage } from "@/lib/types/notebook";

export function NotebookChat({
  deckId,
  hasSource,
  initialMessages = [],
}: {
  deckId: string;
  hasSource: boolean;
  initialMessages?: Pick<NotebookChatMessage, "id" | "role" | "content">[];
}) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [make, setMake] = useState<ChatMakeKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const message = draft.trim();
    if (!hasSource || !message || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    try {
      const response = await fetch(`/api/decks/${deckId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(friendlyGenerateError(result.error || "Chat failed", result.code));
      }
      const next = (result.messages ?? []) as Pick<
        NotebookChatMessage,
        "id" | "role" | "content"
      >[];
      setMessages((current) => [...current, ...next]);
      setMake(result.make ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateKind(kind: ChatMakeKind) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/decks/${deckId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(friendlyGenerateError(result.error || "Generation failed", result.code));
      }
      setMake(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  const makeLabel =
    make === "cards"
      ? t("makeCards")
      : make === "exam"
        ? t("makeExam")
        : make === "notes"
          ? t("makeNotes")
          : make === "mindmap"
            ? t("makeMindmap")
            : null;

  return (
    <section className="notebook-chat">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h2 className="mt-2 text-2xl font-black">{t("title")}</h2>
      {!hasSource ? (
        <p className="mt-3 text-sm text-slate-600">{t("unavailable")}</p>
      ) : (
        <>
          <div className="notebook-chat-log">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-600">{t("empty")}</p>
            ) : (
              messages.map((entry) => (
                <p
                  className={entry.role === "user" ? "notebook-chat-user" : "notebook-chat-assistant"}
                  key={entry.id}
                >
                  {entry.content}
                </p>
              ))
            )}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-rose-800">{error}</p>
          ) : null}
          {make && makeLabel ? (
            <button
              className="secondary-button mt-3"
              disabled={busy}
              onClick={() => void generateKind(make)}
              type="button"
            >
              {makeLabel}
            </button>
          ) : null}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label className="sr-only" htmlFor={`chat-${deckId}`}>
              {t("placeholder")}
            </label>
            <input
              className="field flex-1"
              disabled={busy}
              id={`chat-${deckId}`}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("placeholder")}
              value={draft}
            />
            <button className="primary-button" disabled={busy || !draft.trim()} type="submit">
              {busy ? t("sending") : t("send")}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
