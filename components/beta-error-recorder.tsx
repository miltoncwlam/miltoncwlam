"use client";

import { useEffect } from "react";

import { reportBetaEvent } from "@/lib/beta-client";
import { shouldIgnoreBetaError } from "@/lib/beta-report";

function record(message: string, details: Record<string, unknown>) {
  if (shouldIgnoreBetaError(message)) return;
  void reportBetaEvent({ kind: "error", message, details }).catch(() => {});
}

export function BetaErrorRecorder() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      const message = event.error instanceof Error
        ? event.error.message
        : event.message || "window.error";
      record(message, {
        source: "window.error",
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    }
    function onReject(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "unhandledrejection";
      record(message, {
        source: "unhandledrejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  return null;
}
