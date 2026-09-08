"use client";

import { useTranslations } from "next-intl";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function normalizeHeading(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export type StudyNoteBlock =
  | { type: "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

export function parseStudyNotes(markdown: string, title: string): StudyNoteBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: StudyNoteBlock[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const titleKey = normalizeHeading(title);

  function flushList() {
    if (list?.items.length) blocks.push(list);
    list = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: trimmed.slice(4).trim() });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      const heading = trimmed.slice(2).trim();
      if (normalizeHeading(heading) === titleKey) continue;
      flushList();
      blocks.push({ type: "h2", text: heading });
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
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (list?.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    blocks.push({ type: "p", text: trimmed });
  }
  flushList();
  return blocks;
}

export function StudyNotesView({
  title,
  markdown,
}: {
  title: string;
  markdown: string;
}) {
  const t = useTranslations("studio");
  const blocks = parseStudyNotes(markdown, title);

  function printNotes() {
    document.body.dataset.print = "notes";
    window.print();
    window.setTimeout(() => {
      delete document.body.dataset.print;
    }, 400);
  }

  return (
    <article className="study-notes-paper">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="study-notes-title">{title}</h2>
        <button className="secondary-button no-print" onClick={printNotes} type="button">
          {t("printNotes")}
        </button>
      </div>
      <div className="study-notes-body">
        {blocks.map((block, index) => {
          if (block.type === "h2") {
            return <h2 key={index}>{block.text}</h2>;
          }
          if (block.type === "h3") {
            return <h3 key={index}>{block.text}</h3>;
          }
          if (block.type === "ul") {
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          }
          if (block.type === "ol") {
            return (
              <ol key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          }
          return <p key={index}>{renderInline(block.text)}</p>;
        })}
      </div>
    </article>
  );
}
