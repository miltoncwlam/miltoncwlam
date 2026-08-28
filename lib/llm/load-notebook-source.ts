import "server-only";

import { extractStudyText } from "@/lib/ingest/extract-text";
import { TOPIC_SOURCE_MIME } from "@/lib/llm/generate-flashcards";
import { downloadSourceMedia } from "@/lib/supabase/storage";
import type { Deck } from "@/lib/types/flashcard";

export type NotebookSource = {
  text: string;
  sourceMode: "topic" | "text" | "url" | "file";
  charCount: number;
};

export async function loadNotebookSource(deck: Deck): Promise<NotebookSource> {
  if (deck.sourceContent?.trim()) {
    const text = deck.sourceContent.trim();
    const sourceMode =
      deck.sourceMimeType === TOPIC_SOURCE_MIME
        ? "topic"
        : deck.sourceType === "url"
          ? "url"
          : deck.sourceType === "file"
            ? "file"
            : "text";
    return { text, sourceMode, charCount: text.length };
  }

  if (deck.storagePath) {
    const data = await downloadSourceMedia(deck.storagePath);
    const mime = deck.sourceMimeType || "text/plain";
    const text = await extractStudyText(data, mime);
    if (!text.trim()) {
      throw new Error("Could not read this source. Paste the text and try again.");
    }
    return { text: text.trim(), sourceMode: "file", charCount: text.length };
  }

  throw new Error("This notebook has no source left. Add the notes again.");
}
