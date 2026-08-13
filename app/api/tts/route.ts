import { Communicate } from "edge-tts-universal";
import { NextResponse } from "next/server";

import { parseAppLocale } from "@/lib/i18n/locales";
import { edgeVoiceForLocale } from "@/lib/tts/voices";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_CHARS = 500;
const CONNECTION_TIMEOUT_MS = 15_000;

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
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
}
