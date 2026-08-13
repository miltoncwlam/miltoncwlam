import type { AppLocale } from "@/lib/i18n/locales";

const EDGE_VOICES: Record<AppLocale, string> = {
  en: "en-US-EmmaMultilingualNeural",
  "zh-Hant": "zh-TW-HsiaoChenNeural",
  "zh-Hans": "zh-CN-XiaoxiaoNeural",
  ja: "ja-JP-NanamiNeural",
  ko: "ko-KR-SunHiNeural",
  es: "es-ES-ElviraNeural",
  fr: "fr-FR-DeniseNeural",
};

export function edgeVoiceForLocale(locale: AppLocale): string {
  return EDGE_VOICES[locale] ?? EDGE_VOICES.en;
}
