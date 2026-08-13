export type ImageSourceKind = "commons" | "web" | "ai";

export type ImageAttribution = {
  source: ImageSourceKind;
  license: string;
  author?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  title?: string;
};

const ALLOWED = [
  "cc0",
  "pdm",
  "pd",
  "pd-us",
  "public domain",
  "publicdomain",
  "cc by",
  "cc-by",
  "cc by 4.0",
  "cc by 3.0",
  "cc by 2.0",
  "cc-by-4.0",
  "cc-by-3.0",
  "cc-by-2.0",
  "cc by-sa",
  "cc-by-sa",
  "cc by-sa 4.0",
  "cc by-sa 3.0",
  "cc by-sa 2.0",
  "by",
  "by-sa",
] as const;

function normalizeLicense(value: string) {
  return value
    .toLowerCase()
    .replace(/creativecommons/g, "cc")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPublicDomainOrCc0(license: string) {
  const n = normalizeLicense(license);
  return (
    n === "cc0" ||
    n === "pdm" ||
    n === "pd" ||
    n === "pd-us" ||
    n.includes("public domain") ||
    n === "publicdomain"
  );
}

export function isByFamily(license: string) {
  const n = normalizeLicense(license);
  if (n.includes("nc") || n.includes("nd")) return false;
  return (
    n === "by" ||
    n === "by-sa" ||
    n.startsWith("cc by") ||
    n.startsWith("cc-by")
  );
}

export function licenseIsConfirmed(input: {
  license?: string | null;
  licenseUrl?: string | null;
  artist?: string | null;
  credit?: string | null;
  restrictions?: string | null;
}): boolean {
  const license = input.license?.trim();
  if (!license) return false;
  const n = normalizeLicense(license);
  if (
    n.includes("nc") ||
    n.includes("noncommercial") ||
    n.includes("fair use") ||
    n.includes("all rights") ||
    n.includes("copyrighted")
  ) {
    return false;
  }
  const restrictions = (input.restrictions ?? "").toLowerCase();
  if (
    restrictions.includes("noncommercial") ||
    restrictions.includes("all rights reserved") ||
    restrictions.includes("fair use")
  ) {
    return false;
  }

  const allowed = ALLOWED.some(
    (token) => n === token || n.startsWith(`${token} `),
  );
  if (!allowed) return false;

  if (isByFamily(license)) {
    const who = (input.artist ?? input.credit ?? "").trim();
    if (!who) return false;
    if (!input.licenseUrl?.trim()) return false;
  }

  return true;
}

export function formatImageCredit(attr: ImageAttribution | null | undefined) {
  if (!attr) return null;
  if (attr.source === "ai") return "AI-generated";
  const who = attr.author?.trim() || attr.title?.trim() || "Unknown";
  return `${who} · ${attr.license}`;
}
