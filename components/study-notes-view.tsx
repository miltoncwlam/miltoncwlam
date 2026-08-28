"use client";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function StudyNotesView({
  title,
  markdown,
}: {
  title: string;
  markdown: string;
}) {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <article className="study-notes">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4 space-y-3 text-[1.05rem] leading-7">
        {blocks.map((block, index) => {
          const lines = block.split("\n");
          if (lines[0]?.startsWith("### ")) {
            return (
              <h4 className="font-black" key={index}>
                {lines[0].slice(4)}
              </h4>
            );
          }
          if (lines[0]?.startsWith("## ")) {
            return (
              <h3 className="text-lg font-black" key={index}>
                {lines[0].slice(3)}
              </h3>
            );
          }
          if (lines[0]?.startsWith("# ")) {
            return (
              <h3 className="text-lg font-black" key={index}>
                {lines[0].slice(2)}
              </h3>
            );
          }
          if (lines.every((line) => /^[-*]\s/.test(line))) {
            return (
              <ul className="list-disc space-y-1 pl-5" key={index}>
                {lines.map((line, lineIndex) => (
                  <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s/, ""))}</li>
                ))}
              </ul>
            );
          }
          return <p key={index}>{renderInline(block)}</p>;
        })}
      </div>
    </article>
  );
}
