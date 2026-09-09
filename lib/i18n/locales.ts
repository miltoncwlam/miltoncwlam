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

/** Extra rules so models do not write English with Chinese glosses. */
export function studioLanguageRules(locale: string): string {
  const name = promptLanguageName(locale);
  if (locale === "zh-Hant") {
    return `LANGUAGE (mandatory): Write EVERY heading, bullet, and sentence in Traditional Chinese as used in Hong Kong (繁體中文).
Do not write English paragraphs. If a widely used English proper noun is needed, put it in parentheses after the Chinese, e.g. 周朝 (Zhou).
Never use Simplified Chinese (no 国/这/会/发/变 as simplified forms — use 國/這/會/發/變).
Never output Punycode (xn--), HTML, Markdown reference links, or a single wall of text.`;
  }
  if (locale === "zh-Hans") {
    return `LANGUAGE (mandatory): Write EVERY heading, bullet, and sentence in Simplified Chinese (简体中文).
Do not write English paragraphs. Proper nouns may add English in parentheses after the Chinese.
Never output Punycode (xn--), HTML, or a single wall of text.`;
  }
  if (locale === "ja") {
    return `LANGUAGE (mandatory): Write EVERY heading, bullet, and sentence in Japanese. Do not write English paragraphs. Never output Punycode (xn--).`;
  }
  if (locale === "ko") {
    return `LANGUAGE (mandatory): Write EVERY heading, bullet, and sentence in Korean. Do not write English paragraphs. Never output Punycode (xn--).`;
  }
  return `LANGUAGE: Write ALL output in ${name}. Do not mix in another language except unavoidable proper nouns. Never output Punycode (xn--).`;
}
