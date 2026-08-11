"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  GenerationLoadingScreen,
  type GenerationPhase,
} from "@/components/generation-loading-screen";
import {
  LOCALE_CODES,
  LOCALE_LABELS,
  type AppLocale,
} from "@/lib/i18n/locales";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_COST_PER_CARD } from "@/lib/credits/config";
import type { LLMProvider, OllamaModelId } from "@/lib/types/flashcard";
import { OLLAMA_MODELS } from "@/lib/types/flashcard";

type SourceMode = "topic" | "text" | "url" | "file" | "photo";
type CreateMode = "flashcards" | "quiz";

function friendlyError(
  message: string,
  usingOllama: boolean,
  code?: string,
) {
  if (code === "UNRELATED_SOURCE") {
    return (
      message ||
      "This source doesn’t look like study material. Paste notes, a lesson, or an article — not random chat or memes."
    );
  }
  if (code === "INSUFFICIENT_CONTENT") {
    return (
      message ||
      "Not enough usable study content. Add more notes or try a longer source / fewer cards."
    );
  }
  if (code === "RATE_LIMITED") {
    return message || "Too many generates this hour. Wait a bit, then try again.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return usingOllama
      ? "The request timed out or the connection dropped. Try gemma4:e2b, 6–10 cards, and paste text instead of a long PDF."
      : "The request timed out or the connection dropped. Try again with fewer cards or a shorter source.";
  }
  if (/timed out|aborted|timeout/i.test(message)) {
    return usingOllama
      ? `${message} Tip: switch to gemma4:e2b, use 6–10 cards, and prefer pasted text / TXT over scanned PDFs.`
      : message;
  }
  if (/returned \d+ cards but \d+ were requested/i.test(message)) {
    return usingOllama
      ? `${message} Tip: try fewer cards or the lighter gemma4:e2b model.`
      : message;
  }
  return message;
}

export function CreateDeckForm({
  providers,
  canUpload,
}: {
  providers: LLMProvider[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("create");
  const tg = useTranslations("generation");
  const locale = useLocale() as AppLocale;
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<SourceMode>("topic");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<GenerationPhase>("prepare");
  const [label, setLabel] = useState(tg("preparing"));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [providerChoice, setProviderChoice] = useState<LLMProvider | null>(null);
  const [ollamaModel, setOllamaModel] = useState<OllamaModelId>("gemma4:e2b");
  const [createMode, setCreateMode] = useState<CreateMode>("flashcards");
  const [cardCountPreview, setCardCountPreview] = useState(8);
  const activeMode =
    mode === "text" || mode === "url" || mode === "topic" || canUpload
      ? mode
      : "topic";
  const provider =
    providerChoice && providers.includes(providerChoice)
      ? providerChoice
      : providers[0];
  const usingOllama = provider === "ollama";
  const perCard =
    provider === "ollama" && ollamaModel === "gemma4:e2b"
      ? CREDIT_COST_PER_CARD["gemma4:e2b"]
      : CREDIT_COST_PER_CARD["gemma4:e4b"];
  const energyCost = Math.max(3, Math.min(30, cardCountPreview)) * perCard;

  useEffect(() => {
    if (!pending || error) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [pending, error]);

  async function uploadFile(file: File) {
    const signedResponse = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
    });
    const signed = await signedResponse.json();
    if (!signedResponse.ok) throw new Error(signed.error);

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(signed.bucket)
      .uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type,
      });
    if (uploadError) throw uploadError;

    return signed.path as string;
  }

  async function runGeneration(form: HTMLFormElement) {
    setError(null);
    setPending(true);
    setElapsedSeconds(0);
    setPhase("prepare");
    setLabel(tg("preparing"));

    try {
      const formData = new FormData(form);
      const file = formData.get("sourceFile");
      const selectedProvider = (formData.get("provider") as LLMProvider) || provider;
      const payload: Record<string, unknown> = {
        sourceType: activeMode,
        title: formData.get("title") || undefined,
        provider: selectedProvider,
        cardCount: Number(formData.get("cardCount")),
        difficulty: formData.get("difficulty"),
        language: formData.get("language"),
        questionStyle:
          createMode === "quiz"
            ? "mcq"
            : formData.get("questionStyle") || "mixed",
        mode: createMode,
        sourceRetention: formData.get("sourceRetention") || "24h",
      };

      if (selectedProvider === "ollama") {
        payload.model = (formData.get("ollamaModel") as string) || ollamaModel;
      }

      if (activeMode === "topic") {
        payload.topic = formData.get("topic");
        setPhase("generate");
        setLabel(
          selectedProvider === "ollama" ? tg("gemmaWriting") : tg("aiWriting"),
        );
      } else if (activeMode === "text") {
        payload.content = formData.get("content");
        setPhase("read");
        setLabel(tg("readingNotes"));
      } else if (activeMode === "url") {
        payload.url = formData.get("sourceUrl");
        setPhase("read");
        setLabel(tg("readingSource"));
      } else {
        if (!canUpload) {
          throw new Error(t("uploadSecretError"));
        }
        if (!(file instanceof File) || !file.size) {
          throw new Error(t("chooseFile"));
        }
        setPhase("upload");
        setLabel(tg("uploading"));
        payload.storagePath = await uploadFile(file);
        payload.file = { name: file.name, type: file.type, size: file.size };
        setPhase("read");
        setLabel(tg("readingSource"));
      }

      if (activeMode !== "topic") {
        setPhase("generate");
        setLabel(
          selectedProvider === "ollama" ? tg("gemmaWriting") : tg("aiWriting"),
        );
      }

      let result: {
        error?: string;
        deckId?: string;
        code?: string;
        refunded?: boolean;
      };
      try {
        const response = await fetch("/api/decks/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        result = await response.json();
        if (!response.ok) {
          const base = friendlyError(
            result.error || "Generation failed",
            selectedProvider === "ollama",
            result.code,
          );
          throw new Error(
            result.refunded ? `${base} Energy was refunded.` : base,
          );
        }
      } catch (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : "Generation failed";
        throw new Error(
          /energy was refunded|doesn't look like|not enough usable|too many generates/i.test(
            message,
          )
            ? message
            : friendlyError(message, selectedProvider === "ollama"),
        );
      }

      setPhase("save");
      setLabel(tg("saving"));
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setPhase("done");
      setLabel(tg("doneTitle"));
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      router.push(`/decks/${result.deckId}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? friendlyError(caught.message, usingOllama)
          : "Generation failed",
      );
      // Keep overlay open with Retry / Dismiss
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runGeneration(event.currentTarget);
  }

  if (!providers.length) {
    return (
      <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        {t("noProviders")}
      </p>
    );
  }

  const modes = (
    [
      { value: "topic", label: t("topic"), enabled: true },
      { value: "text", label: t("text"), enabled: true },
      { value: "url", label: t("url"), enabled: true },
      { value: "file", label: t("file"), enabled: canUpload },
      { value: "photo", label: t("photo"), enabled: canUpload },
    ] as const
  );

  const showOverlay = pending || Boolean(error);

  return (
    <>
      {showOverlay ? (
        <GenerationLoadingScreen
          elapsedSeconds={elapsedSeconds}
          error={error}
          includeUpload={activeMode === "file" || activeMode === "photo"}
          label={label}
          onDismiss={() => {
            setError(null);
            setPending(false);
            setPhase("prepare");
          }}
          onRetry={() => {
            if (formRef.current) void runGeneration(formRef.current);
          }}
          phase={phase}
          usingOllama={usingOllama}
        />
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit} ref={formRef}>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 sm:grid-cols-5">
          {modes.map(({ value, label: modeLabel, enabled }) => (
            <button
              className={`rounded-xl px-3 py-3 text-sm font-bold ${
                activeMode === value
                  ? "bg-white text-indigo-700 shadow"
                  : enabled
                    ? "text-slate-600"
                    : "cursor-not-allowed text-slate-400"
              }`}
              disabled={!enabled || pending}
              key={value}
              onClick={() => enabled && setMode(value)}
              type="button"
            >
              {modeLabel}
            </button>
          ))}
        </div>

        {!canUpload ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("uploadNeedsSecret")}
          </p>
        ) : null}

        {usingOllama && activeMode === "file" ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {t("ollamaPdfNote")}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
          {(
            [
              { value: "flashcards" as const, label: t("modeFlashcards") },
              { value: "quiz" as const, label: t("modeQuiz") },
            ] as const
          ).map((entry) => (
            <button
              className={`rounded-xl px-3 py-3 text-sm font-bold ${
                createMode === entry.value
                  ? "bg-white text-indigo-700 shadow"
                  : "text-slate-600"
              }`}
              disabled={pending}
              key={entry.value}
              onClick={() => setCreateMode(entry.value)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {t("energyCost", { cost: energyCost, per: perCard })}
        </p>

        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Source retention
          </span>
          <select
            className="field"
            defaultValue="24h"
            disabled={pending}
            name="sourceRetention"
          >
            <option value="none">Clear immediately (privacy)</option>
            <option value="24h">Keep 24 hours (allows regenerate)</option>
            <option value="keep">Keep until I delete the deck</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-bold text-slate-700">{t("titleLabel")}</span>
          <input
            className="field"
            disabled={pending}
            maxLength={100}
            name="title"
            placeholder={t("titlePlaceholder")}
          />
        </label>

        {activeMode === "topic" ? (
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("topicLabel")}</span>
            <input
              className="field"
              disabled={pending}
              maxLength={200}
              minLength={2}
              name="topic"
              placeholder={t("topicPlaceholder")}
              required
            />
            <p className="text-xs text-slate-500">{t("topicHint")}</p>
          </label>
        ) : activeMode === "text" ? (
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("material")}</span>
            <textarea
              className="field min-h-64 resize-y"
              disabled={pending}
              minLength={50}
              maxLength={80000}
              name="content"
              placeholder={t("materialPlaceholder")}
              required
            />
          </label>
        ) : activeMode === "url" ? (
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("urlLabel")}</span>
            <input
              className="field"
              disabled={pending}
              name="sourceUrl"
              placeholder={t("urlPlaceholder")}
              required
              type="url"
            />
            <p className="text-xs text-slate-500">{t("urlHint")}</p>
          </label>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-700">
              {activeMode === "photo" ? t("photoLabel") : t("fileLabel")}
            </span>
            <input
              accept={activeMode === "photo" ? ".jpg,.jpeg,.png" : ".pdf,.txt,.md"}
              className="field file:mr-4 file:rounded-full file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:font-bold file:text-indigo-700"
              disabled={pending}
              name="sourceFile"
              required
              type="file"
            />
            <p className="text-xs text-slate-500">{t("fileHint")}</p>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("provider")}</span>
            <select
              className="field"
              disabled={pending}
              name="provider"
              onChange={(event) =>
                setProviderChoice(event.target.value as LLMProvider)
              }
              value={provider}
            >
              {providers.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          {usingOllama ? (
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">{t("ollamaModel")}</span>
              <select
                className="field"
                disabled={pending}
                name="ollamaModel"
                onChange={(event) =>
                  setOllamaModel(event.target.value as OllamaModelId)
                }
                value={ollamaModel}
              >
                {OLLAMA_MODELS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("cardCount")}</span>
            <input
              className="field"
              defaultValue={usingOllama ? (ollamaModel === "gemma4:e4b" ? 6 : 8) : 10}
              disabled={pending}
              max={usingOllama ? (ollamaModel === "gemma4:e4b" ? 8 : 12) : 30}
              min={3}
              name="cardCount"
              onChange={(event) =>
                setCardCountPreview(Number(event.target.value) || 8)
              }
              type="number"
            />
            {usingOllama ? (
              <span className="block text-xs text-slate-500">{t("ollamaCardHint")}</span>
            ) : null}
          </label>
          {createMode === "flashcards" ? (
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">{t("questionStyle")}</span>
              <select
                className="field"
                defaultValue="mixed"
                disabled={pending}
                name="questionStyle"
              >
                <option value="mixed">{t("styleMixed")}</option>
                <option value="qa">{t("styleQa")}</option>
                <option value="definition">{t("styleDefinition")}</option>
                <option value="cloze">{t("styleCloze")}</option>
                <option value="mcq">{t("styleMcq")}</option>
              </select>
            </label>
          ) : (
            <p className="self-end rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {t("quizModeNote")}
            </p>
          )}
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("difficulty")}</span>
            <select
              className="field"
              defaultValue="beginner"
              disabled={pending}
              name="difficulty"
            >
              <option value="beginner">{t("beginner")}</option>
              <option value="intermediate">{t("intermediate")}</option>
              <option value="advanced">{t("advanced")}</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">{t("language")}</span>
            <select
              className="field"
              defaultValue={locale}
              disabled={pending}
              name="language"
            >
              {LOCALE_CODES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="primary-button w-full" disabled={pending} type="submit">
          {t("generate")}
        </button>
      </form>
    </>
  );
}
