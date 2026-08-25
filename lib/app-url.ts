const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i;

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

function hostFrom(value?: string) {
  if (!value) return "";
  return trimSlash(value.replace(/^https?:\/\//, ""));
}

/** Prefer a real public origin when NEXT_PUBLIC_APP_URL is still localhost on Vercel. */
export function resolvePublicAppUrl(
  configured: string,
  vercel?: {
    env?: string;
    productionUrl?: string;
    url?: string;
  },
) {
  const trimmed = trimSlash(configured);
  if (trimmed && !LOCAL_HOST.test(trimmed)) return trimmed;

  const host =
    vercel?.env === "production"
      ? hostFrom(vercel.productionUrl) || hostFrom(vercel.url)
      : hostFrom(vercel?.url) || hostFrom(vercel?.productionUrl);
  if (host) return `https://${host}`;
  return trimmed || "http://localhost:3000";
}

export function publicAppUrl() {
  return resolvePublicAppUrl(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    {
      env: process.env.VERCEL_ENV,
      productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      url: process.env.VERCEL_URL,
    },
  );
}

export function withBrowserOrigin(url: string, origin: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${trimSlash(origin)}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // ignore invalid urls
  }
  return url;
}
