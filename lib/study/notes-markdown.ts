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
  const headings = (markdown.match(/^#{2,3}\s+\S/gm) || []).length;
  const sentences = (markdown.match(/[.!?。！？]/g) || []).length;
  if (headings >= 2 && (bullets >= 2 || sentences >= 2)) return true;
  return headings >= 1 && bullets >= 3 && sentences >= 3;
}

const GLOSSARY_HEADING =
  /^(key terms|facts|how to remember|重點詞彙|史實與脈絡|記誦提示|重点词语|史实与脉络|记忆提示|重要用語|要点|覚え方|핵심 용어|핵심 사실|암기 팁|términos clave|hechos|comment retenir|termes clés|faits)$/i;

export function isGlossarySheet(markdown: string) {
  const titles = (markdown.match(/^##\s+(.+)$/gm) ?? []).map((line) =>
    line.replace(/^##\s+/, "").trim(),
  );
  if (!titles.length) return false;
  return titles.every((title) => GLOSSARY_HEADING.test(title));
}

function summaryPoints(text: string) {
  const seen = new Set<string>();
  return String(text ?? "")
    .split(/\n+|(?<=[.!?。！？])\s+/)
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => {
      if (line.length < 12 || notesContainPromptLeak(line)) return false;
      if (GLOSSARY_HEADING.test(line)) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Point-form summary: source topics as headings, one idea per bullet. */
export function pointFormSummary(source: string) {
  const chunks = String(source ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const sections: string[] = [];
  for (const chunk of chunks) {
    if (sections.length >= 8) break;
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const head = lines[0].replace(/^#{1,3}\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
    const titled = head.length <= 80 && !/[.!?。！？]$/.test(head) && lines.length > 1;
    const title = titled ? head : "";
    const points = summaryPoints(titled ? lines.slice(1).join(" ") : lines.join(" ")).slice(0, 6);
    if (points.length < 1) continue;
    const heading = title || "Notes";
    sections.push([`## ${heading}`, ...points.map((point) => `- ${point}`)].join("\n"));
  }
  if (sections.length) return sections.join("\n\n");
  const points = summaryPoints(source).slice(0, 8);
  if (points.length < 3) return "";
  return ["## Notes", ...points.map((point) => `- ${point}`)].join("\n");
}

const NOISE_HEADING =
  /^(?:\d+\s*)?(?:summary|enquiry|enquiries|brainstorm|activity|activities|learning outcomes\b.*|knowledge|attitudes and values|historical skills)$/i;

function isNoiseHeading(heading: string) {
  const text = heading.replace(/^\d+[.)]\s*/, "").replace(/\*\*/g, "").trim();
  if (NOISE_HEADING.test(text)) return true;
  return /^learning outcomes\b/i.test(text);
}

function groupLargeYears(text: string) {
  return text.replace(/\b(\d{5,})\b/g, (digits) =>
    digits.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  );
}

function splitPackedBullet(text: string) {
  const dotted = text
    .split(/\s+[•●]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (dotted.length > 1) return dotted;
  const markers = text.match(/Ape-man|Homo\b|Neanderthal|Lucy\b/gi) || [];
  if (markers.length < 2) return [text];
  const parts = text
    .split(/(?=Ape-man\b|Homo\b|Neanderthal|Lucy\b)/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12);
  return parts.length > 1 ? parts : [text];
}

function isJunkBullet(text: string) {
  const line = text
    .replace(/\*\*/g, "")
    .replace(/^[-*•●]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!line) return true;
  if (/_{2,}/.test(line)) return true;
  if (/[?？]\s*$/.test(line)) return true;
  if (/students to use|find in the illustration|write down the|according to the timeline/i.test(line)) {
    return true;
  }
  if (/^(knowledge|attitudes and values|historical skills)\b/i.test(line)) return true;
  if (/division of periods/i.test(line) && !/[.。]/.test(line)) return true;
  if (/^i what is\b/i.test(line)) return true;
  if (/^fe in the\b/i.test(line)) return true;
  if (line.length < 32 && !/[.!?。！？]/.test(line) && !/\d{4}/.test(line)) return true;
  return false;
}

type NoteSection = { heading: string; bullets: string[] };

function noteSections(markdown: string): NoteSection[] {
  const sections: NoteSection[] = [];
  let current: NoteSection | null = null;
  for (const raw of sanitizeStudyMarkdown(markdown).split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      current = { heading: heading[1].trim(), bullets: [] };
      sections.push(current);
      continue;
    }
    const bullet = trimmed.replace(/^[-*]\s+/, "").trim();
    if (!current) {
      current = { heading: "", bullets: [] };
      sections.push(current);
    }
    current.bullets.push(bullet);
  }
  return sections;
}

/** Drop worksheet lines, invented Summary headings, and ungrouped huge years. */
export function cleanStudyNotes(markdown: string) {
  const pending: string[] = [];
  const kept: NoteSection[] = [];
  const seen = new Set<string>();

  function take(text: string) {
    const next = groupLargeYears(text.replace(/^[-*•●]\s+/, "").trim());
    if (isJunkBullet(next)) return;
    const key = next.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    pending.push(next);
  }

  for (const section of noteSections(markdown)) {
    const bullets = section.bullets.flatMap(splitPackedBullet);
    if (isNoiseHeading(section.heading) || !section.heading) {
      if (/^summary$/i.test(section.heading) || !section.heading) {
        for (const bullet of bullets) take(bullet);
      }
      continue;
    }
    for (const bullet of bullets) take(bullet);
    if (!pending.length) continue;
    kept.push({ heading: groupLargeYears(section.heading), bullets: pending.splice(0) });
  }
  if (pending.length && kept.length) kept[kept.length - 1]!.bullets.push(...pending.splice(0));

  return kept
    .filter((section) => section.bullets.length > 0)
    .map((section) =>
      [`## ${section.heading}`, ...section.bullets.map((bullet) => `- ${bullet}`)].join("\n"),
    )
    .join("\n\n");
}

/** If the model skipped headings/bullets, rebuild a point-form summary. */
export function forceStudyNotesShape(markdown: string): string {
  const cleaned = sanitizeStudyMarkdown(markdown);
  if (
    notesAreStudyReady(cleaned) &&
    /^#{2,3}\s+\S/m.test(cleaned) &&
    !isGlossarySheet(cleaned)
  ) {
    return cleaned;
  }
  const pointed = pointFormSummary(markdown);
  if (notesAreStudyReady(pointed)) return pointed;
  return cleaned;
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
