import { licenseIsConfirmed, type ImageAttribution } from "@/lib/images/license";

export const LICENSED_IMAGE_USER_AGENT =
  "StudyA/0.1 (educational flashcards; https://github.com/flashcard-generator)";
const MAX_BYTES = 4 * 1024 * 1024;
const QUERY_STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "from",
  "that",
  "this",
  "what",
  "which",
  "into",
  "onto",
  "over",
  "under",
  "about",
  "image",
  "photo",
  "picture",
  "file",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "commons",
  "wikimedia",
]);

export function isAllowedImageMime(contentType: string) {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/png" ||
    mime === "image/webp"
  );
}

export type FoundLicensedImage = {
  bytes: Uint8Array;
  contentType: string;
  attribution: ImageAttribution;
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function queryTokens(query: string): string[] {
  return normalizeSearchText(query)
    .split(" ")
    .filter((token) => token.length >= 2 && !QUERY_STOP.has(token));
}

export function titleMatchScore(title: string, query: string): number {
  const tokens = queryTokens(query);
  if (!tokens.length) return 0;
  const hay = normalizeSearchText(title);
  const hits = tokens.filter((token) => hay.includes(token)).length;
  return hits / tokens.length;
}

export function rankHitsByTitle<T>(
  items: T[],
  query: string,
  titleOf: (item: T) => string,
): T[] {
  return items
    .map((item) => ({ item, score: titleMatchScore(titleOf(item), query) }))
    .filter(({ score }) => score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

function looksLikeQuestion(text: string) {
  const trimmed = text.trim();
  return (
    /[?]/.test(trimmed) ||
    /^(what|who|when|where|why|how|which|name|define|explain)\b/i.test(trimmed)
  );
}

function shortNounPhrase(text: string): string | null {
  const first = text.split(/[.;\n]/)[0]?.trim() ?? "";
  if (!first || looksLikeQuestion(first)) return null;
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) return null;
  if (first.length > 80) return null;
  return words.slice(0, 6).join(" ");
}

export function imageSearchQueryForCard(card: {
  imageSearchQuery?: string | null;
  imagePrompt?: string | null;
  front?: string | null;
  back?: string | null;
  artKey?: string | null;
}): string | null {
  const explicit = (card.imageSearchQuery || card.imagePrompt || "").trim();
  if (explicit && !looksLikeQuestion(explicit)) {
    return explicit.slice(0, 80);
  }
  const fromBack = shortNounPhrase(card.back ?? "");
  if (fromBack) return fromBack.slice(0, 80);
  const last = card.artKey?.split(/[/:]/).pop()?.replace(/[-_]+/g, " ").trim();
  if (last && last.length >= 3 && last.length <= 40 && !looksLikeQuestion(last)) {
    return last.slice(0, 80);
  }
  return null;
}

export function queryFallbacks(query: string): string[] {
  const trimmed = query.trim();
  const tokens = queryTokens(trimmed);
  const out = [trimmed];
  if (tokens.length >= 3) out.push(tokens.slice(0, 2).join(" "));
  if (tokens.length >= 2) out.push(tokens[0]!);
  return [...new Set(out.filter(Boolean))];
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": LICENSED_IMAGE_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function downloadImage(url: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
} | null> {
  const response = await fetch(url, {
    headers: { "User-Agent": LICENSED_IMAGE_USER_AGENT },
    signal: AbortSignal.timeout(15_000),
    redirect: "follow",
  });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!isAllowedImageMime(contentType)) return null;
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (!buffer.byteLength || buffer.byteLength > MAX_BYTES) return null;
  return { bytes: buffer, contentType };
}

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

function meta(info: CommonsPage["imageinfo"], key: string) {
  const raw = info?.[0]?.extmetadata?.[key]?.value ?? "";
  return raw.replace(/<[^>]+>/g, "").trim();
}

export async function searchCommons(
  query: string,
): Promise<FoundLicensedImage | null> {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "16",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "1280",
    }).toString();

  const payload = (await fetchJson(url)) as {
    query?: { pages?: Record<string, CommonsPage> };
  } | null;
  const pages = Object.values(payload?.query?.pages ?? {});
  for (const page of rankHitsByTitle(pages, query, (item) => item.title ?? "")) {
    const info = page.imageinfo?.[0];
    const fileUrl = info?.url;
    if (!fileUrl || !isAllowedImageMime(info?.mime ?? "")) continue;
    const license =
      meta(page.imageinfo, "LicenseShortName") || meta(page.imageinfo, "License");
    const artist = meta(page.imageinfo, "Artist");
    const credit = meta(page.imageinfo, "Credit");
    const licenseUrl = meta(page.imageinfo, "LicenseUrl");
    const restrictions =
      meta(page.imageinfo, "Restrictions") || meta(page.imageinfo, "Permission");
    if (
      !licenseIsConfirmed({
        license,
        licenseUrl,
        artist,
        credit,
        restrictions,
      })
    ) {
      continue;
    }
    const downloaded = await downloadImage(fileUrl);
    if (!downloaded) continue;
    return {
      ...downloaded,
      attribution: {
        source: "commons",
        license,
        author: artist || credit || undefined,
        licenseUrl: licenseUrl || undefined,
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title ?? "")}`,
        title: page.title,
      },
    };
  }
  return null;
}

type OpenverseHit = {
  title?: string;
  url?: string;
  foreign_landing_url?: string;
  creator?: string;
  license?: string;
  license_url?: string;
  license_version?: string;
};

export async function searchOpenverse(
  query: string,
): Promise<FoundLicensedImage | null> {
  const url =
    "https://api.openverse.org/v1/images/?" +
    new URLSearchParams({
      q: query,
      page_size: "16",
      license: "cc0,pdm,by,by-sa",
      license_type: "commercial",
    }).toString();

  const payload = (await fetchJson(url)) as { results?: OpenverseHit[] } | null;
  for (const hit of rankHitsByTitle(
    payload?.results ?? [],
    query,
    (item) => item.title ?? "",
  )) {
    const license = [hit.license, hit.license_version].filter(Boolean).join(" ");
    if (
      !licenseIsConfirmed({
        license,
        licenseUrl: hit.license_url,
        artist: hit.creator,
        credit: hit.creator,
      })
    ) {
      continue;
    }
    if (!hit.url) continue;
    const downloaded = await downloadImage(hit.url);
    if (!downloaded) continue;
    return {
      ...downloaded,
      attribution: {
        source: "web",
        license: license || hit.license || "CC",
        author: hit.creator || undefined,
        licenseUrl: hit.license_url || undefined,
        sourceUrl: hit.foreign_landing_url || hit.url,
        title: hit.title,
      },
    };
  }
  return null;
}

export async function findLicensedWebImage(
  query: string,
): Promise<FoundLicensedImage | null> {
  const q = query.trim().slice(0, 120);
  if (!q) return null;
  for (const variant of queryFallbacks(q)) {
    try {
      const fromCommons = await searchCommons(variant);
      if (fromCommons) return fromCommons;
    } catch {
      // Commons timeout or network — try Openverse next.
    }
    try {
      const fromOpenverse = await searchOpenverse(variant);
      if (fromOpenverse) return fromOpenverse;
    } catch {
      // try the next shorter query
    }
  }
  return null;
}
