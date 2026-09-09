export type StudyNoteBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function normalizeHeading(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Models sometimes emit IDN punycode instead of Chinese labels. */
export function stripPunycodeTokens(text: string) {
  return text.replace(/\bxn--[a-z0-9-]+\b:?/gi, "");
}

/**
 * Turn model markdown into line-based notes: real newlines, no xn-- junk,
 * headings/bullets pulled out of a wall of text.
 */
export function sanitizeStudyMarkdown(markdown: string): string {
  let text = String(markdown ?? "");
  text = text.replace(/\r\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "  ");
  text = stripPunycodeTokens(text);
  text = text.replace(/\[([^\]]+)\]:(?=\s)/g, "$1:");
  text = text.replace(/\s+(#{1,3}\s+)/g, "\n$1");
  text = text.replace(/^(#{1,3}\s+[^\n]+?)\s+-\s+/gm, "$1\n- ");
  text = text.replace(/(?:^|\n)\s*[•●▪︎]\s+/g, "\n- ");
  text = text.replace(/([^\n])\s+-\s+(?=[\p{Lu}\u4e00-\u9fff])/gu, "$1\n- ");
  text = text.replace(/([^\n])\s+(\d+[.)]\s+)(?=[\p{Lu}\u4e00-\u9fff])/gu, "$1\n$2");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  if (!text.includes("\n") && (text.match(/\*\*/g) || []).length >= 6) {
    const chunks = [...text.matchAll(/\*\*(.+?)\*\*\s*/g)];
    if (chunks.length >= 3) {
      const intro = text.slice(0, chunks[0]!.index).trim();
      const items = chunks.map((chunk, index) => {
        const start = chunk.index! + chunk[0].length;
        const end = chunks[index + 1]?.index ?? text.length;
        const rest = text.slice(start, end).trim();
        return `- **${chunk[1]}**${rest ? ` ${rest}` : ""}`;
      });
      text = [intro, "## Key terms", ...items].filter(Boolean).join("\n");
    }
  }

  return text.trim();
}

export function parseStudyNotes(markdown: string, title: string): StudyNoteBlock[] {
  const lines = sanitizeStudyMarkdown(markdown).split("\n");
  const blocks: StudyNoteBlock[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const titleKey = normalizeHeading(title);

  function flushList() {
    if (list?.items.length) blocks.push(list);
    list = null;
  }

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s*(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1 && normalizeHeading(text) === titleKey) continue;
      flushList();
      blocks.push({ type: level >= 3 ? "h3" : "h2", text });
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (list?.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered && !/^\d+\.\d+/.test(trimmed)) {
      if (list?.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[2]);
      continue;
    }
    flushList();
    blocks.push({ type: "p", text: trimmed });
  }
  flushList();
  return blocks;
}
