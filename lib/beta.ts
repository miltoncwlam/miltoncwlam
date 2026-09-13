export const STABLE_VERSION = "3.9.3";
export const BETA_VERSION = "4.0.0 beta";
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
) {
  return (
    isVercelPreviewEnv(vercelEnv) ||
    persistBetaChoice(cookieValue) === "enter" ||
    sessionHeader === "1"
  );
}

export function displayAppVersion(hasBeta: boolean) {
  return hasBeta ? BETA_VERSION : STABLE_VERSION;
}
