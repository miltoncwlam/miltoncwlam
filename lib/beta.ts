export const STABLE_VERSION = "3.9.3";
export const BETA_VERSION = "4.0.0";
export const BETA_COOKIE = "hkstudya-beta";
export const BETA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isVercelPreviewEnv(env = process.env.VERCEL_ENV) {
  return env === "preview";
}

export function hasV4BetaCookie(value: string | undefined) {
  return value === "1";
}

export function hasV4BetaAccess(
  cookieValue: string | undefined,
  vercelEnv = process.env.VERCEL_ENV,
) {
  return isVercelPreviewEnv(vercelEnv) || hasV4BetaCookie(cookieValue);
}

export function displayAppVersion(hasBeta: boolean) {
  return hasBeta ? BETA_VERSION : STABLE_VERSION;
}
