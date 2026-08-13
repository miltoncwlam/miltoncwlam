"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";

import {
  GenerationLoadingScreen,
  type GenerationPhase,
} from "@/components/generation-loading-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { estimateGenerationCredits } from "@/lib/credits/estimate-generation";
import {
  LOCALE_CODES,
  LOCALE_LABELS,
  type AppLocale,
} from "@/lib/i18n/locales";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_OPENROUTER_MODEL,
  PAID_OPENROUTER_MODELS,
} from "@/lib/llm/models";
import type { LLMProvider, OllamaModelId } from "@/lib/types/flashcard";
import { OLLAMA_MODELS } from "@/lib/types/flashcard";

type SourceMode = "topic" | "text" | "url" | "file";
type CreateMode = "flashcards" | "quiz";

type FreeModel = { id: string; name: string };

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
      ? "The connection dropped. Try gemma4:e2b, 6–10 cards, and paste text instead of a long PDF."
      : "The connection dropped. Try again with fewer cards or a shorter source.";
  }
  if (/returned \d+ cards but \d+ were requested/i.test(message)) {
    return usingOllama
      ? `${message} Tip: try fewer cards or the lighter gemma4:e2b model.`
      : message;
  }
  return message;
}

function providerLabel(provider: LLMProvider) {
  return provider === "ollama" ? "Ollama" : "OpenRouter";
}

function catalogLabel(name: string) {
  return name
    .replace(/\s*\(free\)/gi, "")
    .replace(/:free\b/gi, "")
    .replace(/\bfree\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function CreateDeckForm({
  providers,
  canUpload,
  energyBalance = 0,
  energyUnlimited = false,
  freeModels = [],
}: {
  providers: LLMProvider[];
  canUpload: boolean;
  energyBalance?: number;
  energyUnlimited?: boolean;
  freeModels?: FreeModel[];
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
  const [providerChoice, setProviderChoice] = useState<LLMProvider | null>(null);
  const [ollamaModel, setOllamaModel] = useState<OllamaModelId>("gemma4:e2b");
  const [openrouterModel, setOpenrouterModel] = useState(DEFAULT_OPENROUTER_MODEL);
  const [createMode, setCreateMode] = useState<CreateMode>("flashcards");
  const [cardCountPreview, setCardCountPreview] = useState(8);
  const [topicChars, setTopicChars] = useState(0);
  const [textChars, setTextChars] = useState(0);
  const [fileMeta, setFileMeta] = useState<{ bytes: number; mimeType: string } | null>(
    null,
  );
  const activeMode =
    mode === "text" || mode === "url" || mode === "topic" || canUpload
      ? mode
      : "topic";
  const provider =
    providerChoice && providers.includes(providerChoice)
      ? providerChoice
      : providers[0];
  const usingOllama = provider === "ollama";
  const estimate = useMemo(
    () =>
      estimateGenerationCredits({
        provider: usingOllama ? "ollama" : "openrouter",
        modelId: usingOllama ? ollamaModel : openrouterModel,
        sourceMode: activeMode,
        sourceSize:
          activeMode === "topic"
            ? { charCount: topicChars }
            : activeMode === "text"
              ? { charCount: textChars }
              : activeMode === "file"
                ? {
                    fileBytes: fileMeta?.bytes,
                    mimeType: fileMeta?.mimeType,
                  }
                : {},
        cardCount: cardCountPreview,
      }),
    [
      usingOllama,
      ollamaModel,
      openrouterModel,
      activeMode,
      topicChars,
      textChars,
      fileMeta,
      cardCountPreview,
    ],
  );
  const textShort = !energyUnlimited && estimate.textCredits > energyBalance;
  const overBalance = textShort;

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
    if (uploadError) throw new Error(uploadError.message);

    return signed.path as string;
  }

  async function runGeneration(form: HTMLFormElement) {
    setError(null);
    setPending(true);
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
      } else {
        payload.model =
          (formData.get("openrouterModel") as string) || openrouterModel;
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
        payload.sourceType = "file";
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
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (overBalance) return;
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
    ] as const
  );

  const showOverlay = pending || Boolean(error);
  const budgetModels = PAID_OPENROUTER_MODELS.filter((entry) => entry.group === "budget");
  const standardModels = PAID_OPENROUTER_MODELS.filter(
    (entry) => entry.group === "standard",
  );

  return (
    <>
      {showOverlay ? (
        <GenerationLoadingScreen
          error={error}
          includeUpload={activeMode === "file"}
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
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 sm:grid-cols-4">
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
                  ? "bg-background text-primary shadow"
                  : "text-muted-foreground"
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
          {t("energyCost", { cost: estimate.textCredits })}
        </p>
        {textShort ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
            {t("energyShort", {
              need: estimate.textCredits,
              have: energyBalance,
            })}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label>Source retention</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue="24h"
            disabled={pending}
            name="sourceRetention"
          >
            <option value="none">Clear immediately (privacy)</option>
            <option value="24h">Keep 24 hours (allows regenerate)</option>
            <option value="keep">Keep until I delete the deck</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">{t("titleLabel")}</Label>
          <Input
            disabled={pending}
            id="title"
            maxLength={100}
            name="title"
            placeholder={t("titlePlaceholder")}
          />
        </div>

        {activeMode === "topic" ? (
          <div className="space-y-2">
            <Label htmlFor="topic">{t("topicLabel")}</Label>
            <Input
              disabled={pending}
              id="topic"
              maxLength={200}
              minLength={2}
              name="topic"
              onChange={(event) => setTopicChars(event.target.value.length)}
              placeholder={t("topicPlaceholder")}
              required
            />
            <p className="text-xs text-muted-foreground">{t("topicHint")}</p>
          </div>
        ) : activeMode === "text" ? (
          <div className="space-y-2">
            <Label htmlFor="content">{t("material")}</Label>
            <Textarea
              className="min-h-64 resize-y"
              disabled={pending}
              id="content"
              minLength={50}
              maxLength={80000}
              name="content"
              onChange={(event) => setTextChars(event.target.value.length)}
              placeholder={t("materialPlaceholder")}
              required
            />
          </div>
        ) : activeMode === "url" ? (
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">{t("urlLabel")}</Label>
            <Input
              disabled={pending}
              id="sourceUrl"
              name="sourceUrl"
              placeholder={t("urlPlaceholder")}
              required
              type="url"
            />
            <p className="text-xs text-muted-foreground">{t("urlHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="sourceFile">{t("fileLabel")}</Label>
            <Input
              accept=".pdf,.txt,.md"
              className="file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-medium"
              disabled={pending}
              id="sourceFile"
              name="sourceFile"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setFileMeta(
                  file ? { bytes: file.size, mimeType: file.type } : null,
                );
              }}
              required
              type="file"
            />
            <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("provider")}</Label>
            <Select
              disabled={pending}
              onValueChange={(value) =>
                setProviderChoice(value as LLMProvider)
              }
              value={provider}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {providerLabel(entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input name="provider" type="hidden" value={provider} />
          </div>
          {usingOllama ? (
            <div className="space-y-2">
              <Label>{t("ollamaModel")}</Label>
              <Select
                disabled={pending}
                onValueChange={(value) =>
                  setOllamaModel(value as OllamaModelId)
                }
                value={ollamaModel}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OLLAMA_MODELS.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input name="ollamaModel" type="hidden" value={ollamaModel} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("model")}</Label>
              <Select
                disabled={pending}
                onValueChange={setOpenrouterModel}
                value={openrouterModel}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {freeModels.length ? (
                    <SelectGroup>
                      <SelectLabel>{t("modelFree")}</SelectLabel>
                      {freeModels.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {catalogLabel(entry.name)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null}
                  <SelectGroup>
                    <SelectLabel>{t("modelBudget")}</SelectLabel>
                    {budgetModels.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>{t("modelStandard")}</SelectLabel>
                    {standardModels.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <input name="openrouterModel" type="hidden" value={openrouterModel} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cardCount">{t("cardCount")}</Label>
            <Input
              defaultValue={usingOllama ? (ollamaModel === "gemma4:e4b" ? 6 : 8) : 10}
              disabled={pending}
              id="cardCount"
              max={usingOllama ? (ollamaModel === "gemma4:e4b" ? 8 : 12) : 30}
              min={3}
              name="cardCount"
              onChange={(event) =>
                setCardCountPreview(Number(event.target.value) || 8)
              }
              type="number"
            />
            {usingOllama ? (
              <span className="block text-xs text-muted-foreground">{t("ollamaCardHint")}</span>
            ) : null}
          </div>
          {createMode === "flashcards" ? (
            <div className="space-y-2">
              <Label>{t("questionStyle")}</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>
          ) : (
            <p className="self-end rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">
              {t("quizModeNote")}
            </p>
          )}
          <div className="space-y-2">
            <Label>{t("difficulty")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue="beginner"
              disabled={pending}
              name="difficulty"
            >
              <option value="beginner">{t("beginner")}</option>
              <option value="intermediate">{t("intermediate")}</option>
              <option value="advanced">{t("advanced")}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </div>

        <Button className="w-full" disabled={pending || overBalance} type="submit">
          {t("generate")}
        </Button>
      </form>
    </>
  );
}
