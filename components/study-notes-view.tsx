"use client";

import { useTranslations } from "next-intl";

import {
  parseStudyNotes,
  splitNoteTerm,
  type StudyNoteBlock,
} from "@/lib/study/notes-markdown";

export type { StudyNoteBlock };
export { parseStudyNotes };

function renderInline(text: string) {
  const parts = text.split(/(\*\*.+?\*\*|__[^_]+?__)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part.replace(/\*\*/g, "")}</span>;
  });
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
            return <h2 key={index}>{renderInline(block.text)}</h2>;
          }
          if (block.type === "h3") {
            return <h3 key={index}>{renderInline(block.text)}</h3>;
          }
          if (block.type === "ul") {
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => {
                  const split = splitNoteTerm(item);
                  if (split) {
                    return (
                      <li className="study-notes-term" key={itemIndex}>
                        <strong>{renderInline(split.term)}</strong>
                        <span>{renderInline(split.meaning)}</span>
                      </li>
                    );
                  }
                  return <li key={itemIndex}>{renderInline(item)}</li>;
                })}
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
          if (block.type === "p") {
            return <p key={index}>{renderInline(block.text)}</p>;
          }
          return null;
        })}
      </div>
    </article>
  );
}
