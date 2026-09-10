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

function cjkCount(text: string) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function looksPrimarilyCjk(text: string) {
  return cjkCount(text) >= 12;
}

function localizedNoteHeadings(text: string) {
  if (/[\uac00-\ud7af]/.test(text)) {
    return { terms: "핵심 용어", facts: "핵심 사실", remember: "암기 팁" };
  }
  if (/[\u3040-\u30ff]/.test(text)) {
    return { terms: "重要用語", facts: "要点", remember: "覚え方" };
  }
  if (/[国这会发变说为与]/.test(text) && !/[國這會發變說為與]/.test(text)) {
    return { terms: "重点词语", facts: "史实与脉络", remember: "记忆提示" };
  }
  if (looksPrimarilyCjk(text)) {
    return { terms: "重點詞彙", facts: "史實與脈絡", remember: "記誦提示" };
  }
  return { terms: "Key terms", facts: "Facts", remember: "How to remember" };
}

function applyLocalizedHeadings(text: string) {
  const headings = localizedNoteHeadings(text);
  return text
    .replace(/^##\s*Key terms\s*$/gim, `## ${headings.terms}`)
    .replace(/^##\s*Facts\s*$/gim, `## ${headings.facts}`)
    .replace(/^##\s*How to remember\s*$/gim, `## ${headings.remember}`);
}

/** Split “term：meaning” or **term** meaning into a heading + body for the notes view. */
export function splitNoteTerm(item: string): { term: string; meaning: string } | null {
  const bold = item.match(/^\*\*(.+?)\*\*\s*[—–-]?\s*(.*)$/);
  if (bold && bold[2].trim()) {
    return { term: bold[1].trim(), meaning: bold[2].trim() };
  }
  const colon = item.match(/^(.{1,40}?)[：:]\s*(.+)$/);
  if (colon) {
    return {
      term: colon[1].replace(/\*\*/g, "").trim(),
      meaning: colon[2].trim(),
    };
  }
  return null;
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
  text = text.replace(
    /(?:^|\n)\s*(Key terms|Facts|How to remember)\s*-+\s*/gi,
    (_, heading: string) => `\n## ${heading}\n- `,
  );
  text = text.replace(/(?:^|\n)\s*[•●▪︎]\s+/g, "\n- ");
  // “。- 新石器時代:” glued without a space after the stop
  text = text.replace(/([。．.！？!?])\s*-+\s*/g, "$1\n- ");
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
      const heading = localizedNoteHeadings(text).terms;
      text = [intro, `## ${heading}`, ...items].filter(Boolean).join("\n");
    }
  }

  return applyLocalizedHeadings(text).trim();
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
