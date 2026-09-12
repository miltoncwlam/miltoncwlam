export type StudyNoteBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function normalizeHeading(value: string) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

const PROMPT_LEAK =
  /注意[：:]|根据指令|根據指令|输出语言|輸出語言|unless the output language|Do not start markdown|Write ALL output|指令说|指令說|我们将使用|我們將使用|原文为英文|原文為英文|因为输出语言|因為輸出語言|没问题。现在写|沒問題。現在寫/i;

export function notesContainPromptLeak(text: string) {
  return PROMPT_LEAK.test(text);
}

export function notesAreStudyReady(markdown: string) {
  if (notesContainPromptLeak(markdown)) return false;
  const bullets = (markdown.match(/^\s*[-*]\s+\S/gm) || []).length;
  const headings = (markdown.match(/^##\s+\S/gm) || []).length;
  return bullets >= 4 && headings >= 2;
}

/** If the model skipped headings/bullets, rebuild a study sheet from leftover lines. */
export function forceStudyNotesShape(
  markdown: string,
  headings: { terms: string; facts: string; remember: string },
): string {
  const cleaned = sanitizeStudyMarkdown(markdown);
  if (notesAreStudyReady(cleaned)) return cleaned;

  const skip = new Set(
    [headings.terms, headings.facts, headings.remember].map((value) =>
      value.toLowerCase(),
    ),
  );
  function collectItems(text: string) {
    return String(text ?? "")
      .split(/\n+|(?<=[.!?。！？])\s+/)
      .map((line) =>
        line
          .replace(/^#{1,6}\s+/, "")
          .replace(/^[-*]\s+/, "")
          .replace(/^\d+[.)]\s+/, "")
          .trim(),
      )
      .filter((line) => {
        if (line.length < 8 || notesContainPromptLeak(line)) return false;
        return !skip.has(line.toLowerCase());
      });
  }

  const seen = new Set<string>();
  const items = [...collectItems(markdown), ...collectItems(cleaned)].filter(
    (item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  ).slice(0, 18);
  if (items.length < 4) return cleaned;

  const termsCount = Math.max(1, Math.ceil(items.length / 3));
  const factsCount = Math.max(1, Math.ceil((items.length - termsCount) / 2));
  const terms = items.slice(0, termsCount);
  const facts = items.slice(termsCount, termsCount + factsCount);
  const remember = items.slice(termsCount + factsCount);
  const factItems = facts.length ? facts : terms.slice(0, 1);
  const rememberItems = remember.length ? remember : terms.slice(-1);

  return [
    `## ${headings.terms}`,
    ...terms.map((item) => `- ${item}`),
    `## ${headings.facts}`,
    ...factItems.map((item) => `- ${item}`),
    `## ${headings.remember}`,
    ...rememberItems.map((item) => `- ${item}`),
  ].join("\n");
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

function tidyMeaning(meaning: string) {
  return meaning
    .replace(/^[：:\s]+/, "")
    .replace(/\s*[-—–]+\s*$/, "")
    .trim();
}

/** Split “term：meaning” or **term** meaning into a heading + body for the notes view. */
export function splitNoteTerm(item: string): { term: string; meaning: string } | null {
  const cleaned = item.replace(/\s+[-—–]+\s*$/, "").trim();
  const bold = cleaned.match(/^\*\*(.+?)\*\*\s*[—–:：-]?\s*(.*)$/);
  if (bold && tidyMeaning(bold[2] || "")) {
    return { term: bold[1].trim(), meaning: tidyMeaning(bold[2]) };
  }
  const colon = cleaned.match(/^(.{1,40}?)[：:]\s*(.+)$/);
  if (colon) {
    return {
      term: colon[1].replace(/\*\*/g, "").trim(),
      meaning: tidyMeaning(colon[2]),
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
  text = text
    .split("\n")
    .filter((line) => !notesContainPromptLeak(line))
    .join("\n");
  text = stripPunycodeTokens(text);
  text = text.replace(/\[([^\]]+)\]:(?=\s)/g, "$1:");
  text = text.replace(/\s+(#{1,3}\s+)/g, "\n$1");
  text = text.replace(/^(#{1,3}\s+[^\n]+?)\s+-\s+/gm, "$1\n- ");
  text = text.replace(
    /(?:^|\n)\s*(Key terms|Facts|How to remember)\s*-+\s*/gi,
    (_, heading: string) => `\n## ${heading}\n- `,
  );
  text = text.replace(/(?:^|\n)\s*[•●▪︎]\s+/g, "\n- ");
  // **term** on one line, meaning on the next starting with a colon
  text = text.replace(/\*\*([^*\n]+)\*\*\s*\n+-?\s*[：:]\s*/g, "**$1**：");
  // “。- 新石器時代:” glued without a space after the stop
  text = text.replace(/([。．.！？!?])\s*-+\s*/g, "$1\n- ");
  text = text.replace(/([^\n-])[ \t]+-\s*$/gm, "$1");
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
  const lines = sanitizeStudyMarkdown(markdown ?? "").split("\n");
  const blocks: StudyNoteBlock[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const titleKey = normalizeHeading(title ?? "");

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
  return foldTermParagraphs(blocks);
}

function foldTermParagraphs(blocks: StudyNoteBlock[]): StudyNoteBlock[] {
  const out: StudyNoteBlock[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const next = blocks[index + 1];
    if (
      (block.type === "p" || block.type === "h3") &&
      next?.type === "p" &&
      /^[：:]/.test(next.text)
    ) {
      const term = block.text.replace(/\*\*/g, "").trim();
      const meaning = next.text.replace(/^[：:\s]+/, "").replace(/\s*[-—–]+\s*$/, "").trim();
      const item = `**${term}** ${meaning}`;
      const last = out[out.length - 1];
      if (last?.type === "ul") last.items.push(item);
      else out.push({ type: "ul", items: [item] });
      index += 1;
      continue;
    }
    if (block.type === "p") {
      const split = splitNoteTerm(block.text);
      if (split) {
        const item = `**${split.term}** ${split.meaning}`;
        const last = out[out.length - 1];
        if (last?.type === "ul") last.items.push(item);
        else out.push({ type: "ul", items: [item] });
        continue;
      }
    }
    out.push(block);
  }
  return out;
}
