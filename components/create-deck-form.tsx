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
import { estimateArtifactCredits } from "@/lib/credits/estimate-generation";
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
import type { LLMProvider } from "@/lib/types/flashcard";

import { friendlyGenerateError } from "@/lib/friendly-generate-error";

type SourceMode = "topic" | "text" | "url" | "file";

type FreeModel = { id: string; name: string };

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
  const [openrouterModel, setOpenrouterModel] = useState(DEFAULT_OPENROUTER_MODEL);
  const [topicChars, setTopicChars] = useState(0);
  const [textChars, setTextChars] = useState(0);
  const [fileMeta, setFileMeta] = useState<{ bytes: number; mimeType: string } | null>(
    null,
  );
  const activeMode =
    mode === "text" || mode === "url" || mode === "topic" || canUpload
      ? mode
      : "topic";
  const provider: LLMProvider = "openrouter";
  const estimate = useMemo(
    () =>
      estimateArtifactCredits({
        provider: "openrouter",
        modelId: openrouterModel,
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
        kind: "ingest",
      }),
    [openrouterModel, activeMode, topicChars, textChars, fileMeta],
  );
  const overBalance = !energyUnlimited && estimate.textCredits > energyBalance;

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
      const payload: Record<string, unknown> = {
        sourceType: activeMode,
        title: String(formData.get("title") || "") || undefined,
        provider: "openrouter",
        language: String(formData.get("language") || locale),
        sourceRetention: String(formData.get("sourceRetention") || "keep"),
        model: (formData.get("openrouterModel") as string) || openrouterModel,
      };

      if (activeMode === "topic") {
        payload.topic = String(formData.get("topic") || "");
        setPhase("read");
        setLabel(tg("readingNotes"));
      } else if (activeMode === "text") {
        payload.content = String(formData.get("content") || "");
        setPhase("read");
        setLabel(tg("readingNotes"));
      } else if (activeMode === "url") {
        payload.url = String(formData.get("sourceUrl") || "");
        setPhase("read");
        setLabel(tg("readingSource"));
      } else {
        if (!canUpload) throw new Error(t("uploadSecretError"));
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

      let result: { error?: string; deckId?: string; code?: string; refunded?: boolean };
      try {
        const response = await fetch("/api/notebooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        try {
          result = await response.json();
        } catch {
          throw new Error(
            response.ok ? "Could not read source" : `Read failed (${response.status})`,
          );
        }
        if (!response.ok) {
          const base = friendlyGenerateError(result.error || "Could not read source", result.code);
          throw new Error(result.refunded ? `${base} Energy was refunded.` : base);
        }
      } catch (fetchError) {
        if (fetchError instanceof TypeError) {
          throw new Error(friendlyGenerateError(fetchError.message));
        }
        throw fetchError;
      }

      setPhase("save");
      setLabel(tg("saving"));
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      setPhase("done");
      setLabel(tg("doneTitle"));
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      router.push(`/decks/${result.deckId}`);
      router.refresh();
    } catch (caught) {
      setPending(false);
      setError(
        caught instanceof Error ? friendlyGenerateError(caught.message) : "Could not read source",
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

        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {t("energyCost", { cost: estimate.textCredits })}
        </p>
        {overBalance ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
            {t("energyShort", {
              need: estimate.textCredits,
              have: energyBalance,
            })}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label>{t("sourceRetention")}</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue="keep"
            disabled={pending}
            name="sourceRetention"
          >
            <option value="24h">{t("retention24h")}</option>
            <option value="keep">{t("retentionKeep")}</option>
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
            <input name="provider" type="hidden" value={provider} />
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
          {t("readSource")}
        </Button>
      </form>
    </>
  );
}
