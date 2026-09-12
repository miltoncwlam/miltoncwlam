import { notesSectionHeadings } from "@/lib/i18n/locales";
import { parseMindmapPayload } from "@/lib/llm/parse-studio";
import type { MindmapPayload, NotesPayload } from "@/lib/types/notebook";

function uniqueBullets(values: string[], cap: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.replace(/^[-*]\s+/, "").trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= cap) break;
  }
  return out;
}

function parseNoteSections(markdown: string) {
  const terms: string[] = [];
  const facts: string[] = [];
  const remember: string[] = [];
  let bucket: "terms" | "facts" | "remember" = "facts";
  for (const line of markdown.split("\n")) {
    if (/^##\s+/.test(line)) {
      const heading = line.replace(/^##\s+/, "").trim().toLowerCase();
      if (/term|詞|词|用語|용어/.test(heading)) bucket = "terms";
      else if (/remember|記誦|记诵|记忆|覚え|암기/.test(heading)) bucket = "remember";
      else bucket = "facts";
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (bullet?.[1]) {
      if (bucket === "terms") terms.push(bullet[1]);
      else if (bucket === "remember") remember.push(bullet[1]);
      else facts.push(bullet[1]);
    }
  }
  return { terms, facts, remember };
}

export function mergeNotesPayloads(
  parts: NotesPayload[],
  language = "en",
): NotesPayload {
  if (parts.length <= 1) {
    return parts[0] ?? { title: "Study notes", markdown: "" };
  }
  const headings = notesSectionHeadings(language);
  const terms: string[] = [];
  const facts: string[] = [];
  const remember: string[] = [];
  for (const part of parts) {
    const parsed = parseNoteSections(part.markdown);
    terms.push(...parsed.terms);
    facts.push(...parsed.facts);
    remember.push(...parsed.remember);
  }
  const markdown = [
    `## ${headings.terms}`,
    ...uniqueBullets(terms, 24).map((item) => `- ${item}`),
    "",
    `## ${headings.facts}`,
    ...uniqueBullets(facts, 28).map((item) => `- ${item}`),
    "",
    `## ${headings.remember}`,
    ...uniqueBullets(remember, 16).map((item) => `- ${item}`),
  ].join("\n");
  return {
    title: parts[0]?.title?.trim() || "Study notes",
    markdown: markdown.slice(0, 20_000),
  };
}

export function mergeMindmapPayloads(parts: MindmapPayload[]): MindmapPayload {
  if (parts.length <= 1) return parts[0] ?? { title: "Map", nodes: [] };
  const nodes: { id: string; parentId: string | null; label: string }[] = [];
  let next = 1;
  let rootId = "";
  for (const [index, part] of parts.entries()) {
    const remap = new Map<string, string>();
    for (const node of part.nodes) {
      if (index > 0 && node.parentId === null) {
        remap.set(node.id, rootId);
        continue;
      }
      const id = `n${next}`;
      next += 1;
      remap.set(node.id, id);
      if (node.parentId === null) rootId = id;
    }
    for (const node of part.nodes) {
      if (index > 0 && node.parentId === null) continue;
      nodes.push({
        id: remap.get(node.id)!,
        parentId: node.parentId ? remap.get(node.parentId) ?? rootId : null,
        label: node.label,
      });
    }
  }
  const trimmed = nodes.slice(0, 40);
  if (trimmed.length < 4) return parts[0]!;
  return parseMindmapPayload({ title: parts[0]!.title, nodes: trimmed });
}
