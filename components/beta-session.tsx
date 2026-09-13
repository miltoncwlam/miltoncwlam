"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { persistBetaPreferenceAction } from "@/lib/actions/beta";
import {
  BETA_EVENT,
  BETA_SESSION_KEY,
  displayAppVersion,
} from "@/lib/beta";
import { isV4GenerallyAvailable } from "@/lib/campaign";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(BETA_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(BETA_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  try {
    return sessionStorage.getItem(BETA_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function enterBetaSession() {
  try {
    sessionStorage.setItem(BETA_SESSION_KEY, "1");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(BETA_EVENT));
}

export function useInBeta(persistBeta: boolean, preview: boolean) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return isV4GenerallyAvailable() || preview || persistBeta || session;
}

export function AppVersion({
  persistBeta,
  preview,
}: {
  persistBeta: boolean;
  preview: boolean;
}) {
  const beta = useInBeta(persistBeta, preview);
  return <span className="app-version">Version {displayAppVersion(beta)}</span>;
}

const BetaCtx = createContext({ inBeta: false });

export function BetaSessionProvider({
  persistBeta,
  preview,
  children,
}: {
  persistBeta: boolean;
  preview: boolean;
  children: ReactNode;
}) {
  const inBeta = useInBeta(persistBeta, preview);
  return <BetaCtx.Provider value={{ inBeta }}>{children}</BetaCtx.Provider>;
}

export function useBetaSession() {
  return useContext(BetaCtx);
}

export function BetaOnly({ children }: { children: ReactNode }) {
  const { inBeta } = useBetaSession();
  if (isV4GenerallyAvailable() || !inBeta) return null;
  return children;
}

export async function enterBeta(quiet: boolean) {
  enterBetaSession();
  if (quiet) await persistBetaPreferenceAction("enter");
}

export async function hideBetaPrompt(quiet: boolean) {
  if (quiet) await persistBetaPreferenceAction("hide");
}
