import { Communicate } from "edge-tts-universal";
import { NextResponse } from "next/server";

import { parseAppLocale } from "@/lib/i18n/locales";
import { edgeVoiceForLocale } from "@/lib/tts/voices";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CHARS = 500;
const CONNECTION_TIMEOUT_MS = 15_000;

// Global in-memory LRU-style cache across dev server reloads
const globalForTts = globalThis as unknown as {
  ttsCache?: Map<string, Buffer>;
};

const ttsCache = globalForTts.ttsCache ?? new Map<string, Buffer>();
if (process.env.NODE_ENV !== "production") {
  globalForTts.ttsCache = ttsCache;
}

const MAX_CACHE_ENTRIES = 300;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    text?: string;
    locale?: string;
  } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const locale = parseAppLocale(body?.locale);
  const voice = edgeVoiceForLocale(locale);
  const cacheKey = `${voice}:${text}`;

  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-TTS-Cache": "HIT",
      },
    });
  }

  try {
    const communicate = new Communicate(text, {
      voice,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
    });
    const audioChunks: Buffer[] = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        audioChunks.push(chunk.data);
      }
    }

    if (audioChunks.length === 0) {
      return NextResponse.json({ error: "No audio received" }, { status: 502 });
    }

    const audio = Buffer.concat(audioChunks);

    if (ttsCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, audio);

    return new NextResponse(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-TTS-Cache": "MISS",
      },
    });
  } catch {
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}
