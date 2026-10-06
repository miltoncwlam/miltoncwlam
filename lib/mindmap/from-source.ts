import { parseMindmapPayload } from "@/lib/llm/parse-studio";
import type { MindmapPayload } from "@/lib/types/notebook";

const NOISE =
  /^(jump to content|main menu|navigation|contents|search|donate|log in|create account|personal tools|move to sidebar|hide|appearance|contribute|special pages|current events|random article|about wikipedia|contact us|community portal|recent changes|upload file|learn to edit|help|focus|learning outcomes|knowledge|attitudes and values|historical skills|summary|key terms|toggle .*subsection.*)$/i;

function clean(line: string) {
  return line
    .replace(/^[\s•\-*·]+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoise(line: string) {
  const text = clean(line);
  if (!text) return true;
  if (NOISE.test(text)) return true;
  if (/^topic\s+\d+$/i.test(text)) return true;
  return false;
}

function isBullet(line: string) {
  return /^[\s]*([•\-*·]|\d+[.)])\s+\S/.test(line);
}

function isDate(text: string) {
  return /^(around\s+)?\d{3,}/i.test(text);
}

function isHeading(text: string) {
  if (!/^[\p{Lu}\u4e00-\u9fff]/u.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 6 && text.length <= 40 && !/[.!?]$/.test(text);
}

function nextStartsFacts(lines: string[], index: number) {
  for (let cursor = index + 1; cursor < Math.min(lines.length, index + 4); cursor += 1) {
    const raw = lines[cursor]!;
    if (isNoise(raw)) continue;
    const text = clean(raw);
    if (!text) continue;
    return isBullet(raw) || isDate(text);
  }
  return false;
}

function clip(label: string, max = 72) {
  const text = label.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > 24 ? cut.slice(0, space) : cut).replace(/[,:;–-]\s*$/, "");
}

type Section = { title: string; points: string[] };

/** A study map from headings and bullets when the model does not finish. */
export function mindmapFromSource(source: string, titleHint = "Study map"): MindmapPayload {
  const lines = source
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: Section[] = [];
  let current: Section | null = null;
  let pending: string | null = null;
  let rootTitle = "";

  function open(title: string) {
    if (sections.length >= 6) {
      current = sections[sections.length - 1] ?? null;
      return;
    }
    current = { title: clip(title, 40), points: [] };
    sections.push(current);
  }

  function addPoint(text: string) {
    const point = clip(text);
    if (point.length < 3 || !current) return;
    if (current.points.some((item) => item.toLowerCase() === point.toLowerCase())) return;
    if (current.points.length < 4) current.points.push(point);
  }

  function ensureSection() {
    if (pending) {
      open(pending);
      pending = null;
      return;
    }
    if (!current) open("Key points");
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]!;
    if (isNoise(raw)) {
      pending = null;
      continue;
    }
    const text = clean(raw);
    if (!text || isNoise(text)) {
      pending = null;
      continue;
    }

    if (isBullet(raw)) {
      let point = text;
      while (index + 1 < lines.length) {
        const nextRaw = lines[index + 1]!;
        if (isBullet(nextRaw) || isNoise(nextRaw)) break;
        const next = clean(nextRaw);
        if (!next || isHeading(next) || isDate(next)) break;
        if (/^[\p{Lu}]/u.test(next)) break;
        if (!/^[a-z(（\u4e00-\u9fff]/.test(next) && next.length >= 28) break;
        point = `${point} ${next}`;
        index += 1;
      }
      ensureSection();
      addPoint(point);
      continue;
    }

    if (isDate(text)) {
      const parts = [text];
      while (parts.length < 3 && index + 1 < lines.length) {
        const nextRaw = lines[index + 1]!;
        const next = clean(nextRaw);
        if (!next || isNoise(nextRaw) || isBullet(nextRaw) || isDate(next)) break;
        if (next.length > 42) break;
        parts.push(next);
        index += 1;
      }
      ensureSection();
      addPoint(parts.join(" — "));
      continue;
    }

    if (!rootTitle && text.length <= 48) {
      const next = lines[index + 1] ? clean(lines[index + 1]!) : "";
      if (text.endsWith(":") && next && next.length <= 42 && !isBullet(lines[index + 1]!)) {
        rootTitle = clip(`${text} ${next}`.replace(/:\s*/, ": "), 48);
        index += 1;
      } else {
        rootTitle = clip(text, 48);
      }
      continue;
    }

    if (
      isHeading(text) ||
      (/^[\p{Lu}\u4e00-\u9fff]/u.test(text) && text.length <= 40 && nextStartsFacts(lines, index))
    ) {
      pending = text;
      continue;
    }

    if (text.length <= 42) {
      ensureSection();
      addPoint(text);
      continue;
    }

    ensureSection();
    addPoint(text);
  }

  const branches = sections.filter((section) => section.points.length > 0).slice(0, 6);
  const nodes: { id: string; parentId: string | null; label: string }[] = [
    { id: "n1", parentId: null, label: rootTitle || clip(titleHint, 48) },
  ];
  let nextId = 2;
  for (const branch of branches) {
    if (nodes.length >= 32) break;
    const id = `n${nextId}`;
    nextId += 1;
    nodes.push({ id, parentId: "n1", label: branch.title });
    for (const point of branch.points) {
      if (nodes.length >= 32) break;
      nodes.push({ id: `n${nextId}`, parentId: id, label: point });
      nextId += 1;
    }
  }

  if (nodes.length < 4) {
    const spare = source
      .split(/[.\n]/)
      .map((part) => clip(clean(part), 64))
      .filter((part) => part.length > 12 && !isNoise(part));
    for (const label of spare) {
      if (nodes.length >= 4) break;
      nodes.push({ id: `n${nextId}`, parentId: "n1", label });
      nextId += 1;
    }
  }

  return parseMindmapPayload({
    title: nodes[0]?.label || titleHint,
    nodes: nodes.slice(0, 36),
  });
}
