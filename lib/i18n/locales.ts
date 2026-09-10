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

export type NotesSectionHeadings = {
  terms: string;
  facts: string;
  remember: string;
};

/** Study-note section titles in the output language (never English for CJK). */
export function notesSectionHeadings(locale: string): NotesSectionHeadings {
  if (locale === "zh-Hant") {
    return { terms: "重點詞彙", facts: "史實與脈絡", remember: "記誦提示" };
  }
  if (locale === "zh-Hans") {
    return { terms: "重点词语", facts: "史实与脉络", remember: "记忆提示" };
  }
  if (locale === "ja") {
    return { terms: "重要用語", facts: "要点", remember: "覚え方" };
  }
  if (locale === "ko") {
    return { terms: "핵심 용어", facts: "핵심 사실", remember: "암기 팁" };
  }
  if (locale === "es") {
    return { terms: "Términos clave", facts: "Hechos", remember: "Cómo recordar" };
  }
  if (locale === "fr") {
    return { terms: "Termes clés", facts: "Faits", remember: "Comment retenir" };
  }
  return { terms: "Key terms", facts: "Facts", remember: "How to remember" };
}

/** Mind-map bubble copy: short labels in the same language as the notes. */
export function mindmapLabelRules(locale: string): string {
  if (locale === "zh-Hant" || locale === "zh-Hans") {
    const script =
      locale === "zh-Hant" ? "Traditional Chinese (繁體)" : "Simplified Chinese (简体)";
    return `LABELS (mandatory): every node label in ${script} only.
Root 4–12 characters. Branches and leaves 2–10 characters. Dates may stay as numbers (e.g. 前2070).
Never use English titles such as Unit 1, Prehistory, Knowledge, Skills, Values, or Xia Shang Zhou.`;
  }
  if (locale === "ja") {
    return `LABELS: every node in Japanese, 2–12 characters. No English titles.`;
  }
  if (locale === "ko") {
    return `LABELS: every node in Korean, 2–12 characters. No English titles.`;
  }
  return `LABELS: 2–6 words in ${promptLanguageName(locale)}. Keep them short enough to fit in a bubble.`;
}

export type StudioDepth = "basic" | "detailed";
export type StudioPurpose = "starter" | "exam";

export function studioSourceSlice(source: string, depth: StudioDepth = "basic") {
  return source.slice(0, depth === "detailed" ? 18_000 : 12_000);
}

export function studioCardCount(depth: StudioDepth = "basic") {
  return depth === "detailed" ? 16 : 8;
}

/** Depth + purpose for every studio tile (notes, map, exam, cards). */
export function studioIntentRules(
  depth: StudioDepth = "basic",
  purpose: StudioPurpose = "starter",
  kind: "notes" | "mindmap" | "exam" | "cards" = "notes",
): string {
  const depthLine =
    depth === "detailed"
      ? kind === "mindmap"
        ? "DEPTH: detailed. 5–6 main branches, 16–28 nodes, optional grandchildren. Short labels still."
        : kind === "cards"
          ? "DEPTH: detailed. Cover more facts; still one idea per card."
          : kind === "exam"
            ? "DEPTH: detailed. Prefer comparisons, dates, and multi-step items within the time limit."
            : "DEPTH: detailed. More terms and comparisons. Keep bullets readable, one idea per line."
      : kind === "mindmap"
        ? "DEPTH: basic. 4–5 main branches, 8–14 nodes, depth 2 only (no grandchildren)."
        : kind === "cards"
          ? "DEPTH: basic. Only the most testable facts. No filler."
          : kind === "exam"
            ? "DEPTH: basic. Shorter prompts. One idea per question."
            : "DEPTH: basic. 1–2 short lines per term. Skip minor asides.";
  const purposeLine =
    purpose === "exam"
      ? "PURPOSE: exam revision. Prefer dates, cause/effect, compare/contrast, and likely exam wording. No trick questions that the source does not support."
      : "PURPOSE: first look. Teach the topic. Define terms. No trick questions.";
  return `${depthLine}\n${purposeLine}`;
}

/** Extra rules so models do not write English with Chinese glosses. */
export function studioLanguageRules(locale: string): string {
  const name = promptLanguageName(locale);
  if (locale === "zh-Hant") {
    return `LANGUAGE (mandatory): Write EVERY heading, title, bullet, mind-map label, and sentence in Traditional Chinese as used in Hong Kong (繁體中文).
Do not write English paragraphs. If a widely used English proper noun is needed, put it in parentheses after the Chinese, e.g. 周朝 (Zhou).
Never use English UI labels such as Key terms, Facts, How to remember, Unit 1, Knowledge, Skills, or Values.
Never use Simplified Chinese (no 国/这/会/发/变 as simplified forms — use 國/這/會/發/變).
Never output Punycode (xn--), HTML, Markdown reference links, or a single wall of text.`;
  }
  if (locale === "zh-Hans") {
    return `LANGUAGE (mandatory): Write EVERY heading, title, bullet, mind-map label, and sentence in Simplified Chinese (简体中文).
Do not write English paragraphs. Proper nouns may add English in parentheses after the Chinese.
Never use English UI labels such as Key terms, Facts, or How to remember.
Never output Punycode (xn--), HTML, or a single wall of text.`;
  }
  if (locale === "ja") {
    return `LANGUAGE (mandatory): Write EVERY heading, bullet, mind-map label, and sentence in Japanese. Do not write English paragraphs. Never output Punycode (xn--).`;
  }
  if (locale === "ko") {
    return `LANGUAGE (mandatory): Write EVERY heading, bullet, mind-map label, and sentence in Korean. Do not write English paragraphs. Never output Punycode (xn--).`;
  }
  return `LANGUAGE: Write ALL output in ${name}. Do not mix in another language except unavoidable proper nouns. Never output Punycode (xn--).`;
}
