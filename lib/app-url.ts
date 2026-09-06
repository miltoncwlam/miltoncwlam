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

/** Same-origin path only — blocks open redirects after sign-in. */
export function safeAppPath(value: unknown, fallback = "/decks") {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}

/** Decode pk_test_/pk_live_ into the Clerk Account Portal origin. */
export function clerkAccountPortalOrigin(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(?:test|live)_/, "");
  const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
  const decoded = Buffer.from(padded, "base64")
    .toString("utf8")
    .replace(/\$$/, "");
  let host = decoded.replace(/\.clerk\.accounts\.dev$/, ".accounts.dev");
  // Production FAPI is clerk.example.com; Account Portal is accounts.example.com
  if (host.startsWith("clerk.") && !host.endsWith(".accounts.dev")) {
    host = `accounts.${host.slice("clerk.".length)}`;
  }
  return `https://${host}`;
}

export function clerkHostedAuthUrl(
  kind: "sign-in" | "sign-up",
  returnTo: string,
  publishableKey: string,
): string {
  const url = new URL(`/${kind}`, clerkAccountPortalOrigin(publishableKey));
  url.searchParams.set("redirect_url", returnTo);
  return url.toString();
}

export function clerkAppOrigin(appUrl: string) {
  try {
    const url = new URL(appUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.protocol = "http:";
    }
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

/** Absolute Frontend API proxy. Relative `/__clerk` crashes Clerk SSR (`window is not defined`). */
export function clerkFrontendProxyUrl(appUrl: string) {
  return `${clerkAppOrigin(appUrl)}/__clerk`;
}

/** Clerk always prefixes `https://` unless clerkJSUrl is set; local must stay http. */
export function clerkJsScriptUrl(appUrl: string) {
  return `${clerkFrontendProxyUrl(appUrl)}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
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
