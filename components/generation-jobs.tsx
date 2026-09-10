"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useToast } from "@/components/toast-provider";
import { friendlyGenerateError } from "@/lib/friendly-generate-error";

export type GenerationJob = {
  deckId: string;
  title: string;
  status: "pending" | "processing" | "complete" | "failed";
  error: string | null;
  kind: "ingest" | "mindmap" | "notes" | "exam" | "cards";
  ocrNext?: number;
  ocrTotal?: number;
};

type JobsContextValue = {
  jobs: GenerationJob[];
  watchDeck: (deckId: string, title?: string) => void;
};

const JobsContext = createContext<JobsContextValue | null>(null);

function jobKey(job: GenerationJob) {
  return `${job.deckId}:${job.kind}`;
}

export function GenerationJobsProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("generation");
  const { pushToast } = useToast();
  const router = useRouter();
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const seenComplete = useRef(new Set<string>());
  const signedOut = useRef(false);

  const refresh = useCallback(async () => {
    if (signedOut.current) return;
    try {
      const response = await fetch("/api/notebooks/jobs");
      if (response.status === 401) {
        signedOut.current = true;
        return;
      }
      if (!response.ok) return;
      const payload = (await response.json()) as { jobs?: GenerationJob[] };
      const next = payload.jobs ?? [];
      setJobs((current) => {
        for (const job of current) {
          const still = next.find(
            (entry) => jobKey(entry) === jobKey(job),
          );
          if (
            !still &&
            job.status !== "failed" &&
            !seenComplete.current.has(jobKey(job))
          ) {
            seenComplete.current.add(jobKey(job));
            pushToast(
              job.kind === "ingest" ? t("doneTitle") : t("studioReady", { kind: job.kind }),
            );
            router.refresh();
          }
        }
        for (const job of next) {
          if (job.status === "failed" && job.error) {
            const key = `${jobKey(job)}:failed`;
            if (!seenComplete.current.has(key)) {
              seenComplete.current.add(key);
              pushToast(friendlyGenerateError(job.error));
            }
          }
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [pushToast, router, t]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const watchDeck = useCallback((deckId: string, title?: string) => {
    setJobs((current) => {
      if (current.some((job) => job.deckId === deckId && job.kind === "ingest")) {
        return current;
      }
      return [
        {
          deckId,
          title: title || "Notebook",
          status: "processing",
          error: null,
          kind: "ingest",
        },
        ...current,
      ];
    });
    void fetch(`/api/notebooks/${deckId}/process`, { method: "POST" }).catch(
      () => {
        // Server tick already running.
      },
    );
  }, []);

  const value = useMemo(() => ({ jobs, watchDeck }), [jobs, watchDeck]);

  return (
    <JobsContext.Provider value={value}>
      {children}
      <GenerationBanner jobs={jobs} />
    </JobsContext.Provider>
  );
}

export function RetryIngestButton({ deckId }: { deckId: string }) {
  const t = useTranslations("generation");
  return (
    <button
      className="secondary-button"
      onClick={() => {
        void fetch(`/api/notebooks/${deckId}/process`, { method: "POST" });
      }}
      type="button"
    >
      {t("retry")}
    </button>
  );
}

export function useGenerationJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) {
    return {
      jobs: [] as GenerationJob[],
      watchDeck: () => {
        // no-op outside provider
      },
    };
  }
  return ctx;
}

function GenerationBanner({ jobs }: { jobs: GenerationJob[] }) {
  const t = useTranslations("generation");
  const busy = jobs.filter((job) => job.status === "processing" || job.status === "pending");
  const failed = jobs.filter((job) => job.status === "failed");
  const job = busy[0] ?? failed[0];
  if (!job) return null;

  const reading =
    job.kind === "ingest" && job.ocrTotal
      ? t("readingPage", {
          current: Math.min(job.ocrNext ?? 1, job.ocrTotal),
          total: job.ocrTotal,
        })
      : job.kind === "ingest"
        ? t("readingSource")
        : t("studioWorking", { kind: job.kind });

  return (
    <div className="sticky top-0 z-40 border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-sm text-indigo-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {job.status === "failed"
            ? job.error
              ? friendlyGenerateError(job.error)
              : t("errorTitle")
            : `${job.title}: ${reading}`}
        </p>
        <div className="flex gap-2">
          <Link className="text-button" href={`/decks/${job.deckId}`}>
            {t("openNotebook")}
          </Link>
          {job.status === "failed" && job.kind === "ingest" ? (
            <button
              className="text-button"
              onClick={() => {
                void fetch(`/api/notebooks/${job.deckId}/process`, {
                  method: "POST",
                });
              }}
              type="button"
            >
              {t("retry")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
