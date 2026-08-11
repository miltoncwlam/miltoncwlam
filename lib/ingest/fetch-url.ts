import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 1_500_000;
const MAX_TEXT = 80_000;
const FETCH_TIMEOUT_MS = 15_000;

function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }
  const v4 = ip.includes(".") ? ip : null;
  if (!v4) return false;
  const parts = v4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("That host is not allowed");
  }

  const literal = isIP(host);
  if (literal) {
    if (isPrivateIp(host)) throw new Error("Private network addresses are blocked");
    return url;
  }

  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length) throw new Error("Could not resolve host");
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error("Private network addresses are blocked");
    }
  }
  return url;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function youtubeVideoId(url: URL): string | null {
  if (
    url.hostname === "youtu.be" ||
    url.hostname.endsWith(".youtu.be")
  ) {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (
    url.hostname.includes("youtube.com") ||
    url.hostname.includes("youtube-nocookie.com")
  ) {
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
      return parts[1] ?? null;
    }
  }
  return null;
}

async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const response = await fetch(watchUrl, {
    headers: {
      "User-Agent": "StudyA-FlashcardBot/1.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error("Could not load YouTube page");
  }
  const html = await response.text();
  const match =
    html.match(/"captionTracks":(\[[\s\S]*?\])/) ||
    html.match(/"captionTracks":(\[[\s\S]*?\])\s*,\s*"/);
  if (!match?.[1]) {
    throw new Error(
      "No captions found for this YouTube video. Paste a transcript or use another URL.",
    );
  }
  let tracks: Array<{ baseUrl?: string; languageCode?: string }> = [];
  try {
    tracks = JSON.parse(match[1]) as typeof tracks;
  } catch {
    throw new Error("Could not parse YouTube captions");
  }
  const track =
    tracks.find((t) => t.languageCode?.startsWith("en")) || tracks[0];
  if (!track?.baseUrl) {
    throw new Error("No usable YouTube caption track");
  }
  const captionRes = await fetch(track.baseUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!captionRes.ok) throw new Error("Could not download YouTube captions");
  const xml = await captionRes.text();
  const text = xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 50) {
    throw new Error("YouTube captions were too short to study from");
  }
  return text.slice(0, MAX_TEXT);
}

export async function fetchStudyTextFromUrl(rawUrl: string): Promise<{
  content: string;
  sourceUrl: string;
  kind: "youtube" | "webpage" | "markdown";
}> {
  const url = await assertSafeUrl(rawUrl);
  const videoId = youtubeVideoId(url);
  if (videoId) {
    const content = await fetchYoutubeTranscript(videoId);
    return { content, sourceUrl: url.toString(), kind: "youtube" };
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "StudyA-FlashcardBot/1.0 (+https://localhost)",
      Accept: "text/html,text/plain,text/markdown,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not fetch URL (${response.status})`);
  }

  const finalUrl = new URL(response.url);
  await assertSafeUrl(finalUrl.toString());

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("Remote content is too large (max ~1.5MB)");
  }
  const raw = buffer.toString("utf8");

  if (
    contentType.includes("text/markdown") ||
    finalUrl.pathname.endsWith(".md") ||
    finalUrl.pathname.endsWith(".markdown")
  ) {
    const content = raw.trim().slice(0, MAX_TEXT);
    if (content.length < 50) throw new Error("Markdown source is too short");
    return { content, sourceUrl: finalUrl.toString(), kind: "markdown" };
  }

  if (
    contentType.includes("text/plain") ||
    finalUrl.pathname.endsWith(".txt")
  ) {
    const content = raw.trim().slice(0, MAX_TEXT);
    if (content.length < 50) throw new Error("Text source is too short");
    return { content, sourceUrl: finalUrl.toString(), kind: "markdown" };
  }

  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml") &&
    contentType.length > 0
  ) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const content = htmlToText(raw).slice(0, MAX_TEXT);
  if (content.length < 50) {
    throw new Error("Could not extract enough readable text from that page");
  }
  return { content, sourceUrl: finalUrl.toString(), kind: "webpage" };
}
