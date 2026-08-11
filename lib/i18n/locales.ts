export const LOCALE_CODES = [
  "en",
  "zh-Hant",
  "zh-Hans",
  "ja",
  "ko",
  "es",
  "fr",
] as const;

export type AppLocale = (typeof LOCALE_CODES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  "zh-Hant": "繁體中文",
  "zh-Hans": "简体中文",
  ja: "日本語",
  ko: "한국어",
  es: "Español",
  fr: "Français",
};

/** Names used inside LLM prompts */
export const LOCALE_PROMPT_NAMES: Record<AppLocale, string> = {
  en: "English",
  "zh-Hant": "Traditional Chinese",
  "zh-Hans": "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
};

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALE_CODES as readonly string[]).includes(value);
}

export function parseAppLocale(value: string | null | undefined): AppLocale {
  if (value && isAppLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export function promptLanguageName(locale: string): string {
  if (isAppLocale(locale)) return LOCALE_PROMPT_NAMES[locale];
  return LOCALE_PROMPT_NAMES.en;
}
