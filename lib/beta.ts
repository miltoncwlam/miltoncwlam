import {
  isV41Released,
  isV42Released,
  isV43Released,
  isV44Released,
  isV45Released,
  isV4GenerallyAvailable,
} from "@/lib/campaign";

export const STABLE_VERSION = "3.9.3";
export const BETA_VERSION = "4.0.0 beta";
export const GA_VERSION = "4.0.0";
export const V41_VERSION = "4.1.0";
export const V42_VERSION = "4.2.0";
export const V43_VERSION = "4.3.0";
export const V44_VERSION = "4.4.0";
export const V45_VERSION = "4.5.0";
export const BETA_COOKIE = "hkstudya-beta";
export const BETA_SESSION_KEY = "hkstudya-beta-session";
export const BETA_EVENT = "hkstudya-beta";
export const BETA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type BetaPersist = "enter" | "hide" | null;

export function isVercelPreviewEnv(env = process.env.VERCEL_ENV) {
  return env === "preview";
}

export function persistBetaChoice(value: string | undefined): BetaPersist {
  if (value === "enter" || value === "1") return "enter";
  if (value === "hide") return "hide";
  return null;
}

export function hasV4BetaAccess(
  cookieValue: string | undefined,
  vercelEnv = process.env.VERCEL_ENV,
  sessionHeader?: string | null,
  now = Date.now(),
) {
  return (
    isV4GenerallyAvailable(now) ||
    isVercelPreviewEnv(vercelEnv) ||
    persistBetaChoice(cookieValue) === "enter" ||
    sessionHeader === "1"
  );
}

export function displayAppVersion(hasBeta: boolean, now = Date.now()) {
  if (isV45Released(now)) return V45_VERSION;
  if (isV44Released(now)) return V44_VERSION;
  if (isV43Released(now)) return V43_VERSION;
  if (isV42Released(now)) return V42_VERSION;
  if (isV41Released(now)) return V41_VERSION;
  if (isV4GenerallyAvailable(now)) return GA_VERSION;
  return hasBeta ? BETA_VERSION : STABLE_VERSION;
}
