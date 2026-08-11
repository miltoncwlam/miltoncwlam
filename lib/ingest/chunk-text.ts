export type TextChunk = {
  id: string;
  label: string;
  text: string;
  cardCount: number;
};

const DEFAULT_CHUNK_SIZE = 7_000;
const DEFAULT_OVERLAP = 400;
const CHUNK_THRESHOLD = 9_000;

const HEADING_RE =
  /^(?:#{1,3}\s+.+|chapter\s+\d+\b.*|unit\s+\d+\b.*|section\s+\d+\b.*|\d+\.\s+[A-Z].+)$/gim;

export function shouldChunkText(text: string, threshold = CHUNK_THRESHOLD) {
  return text.trim().length > threshold;
}

function splitByHeadings(text: string): { label: string; text: string }[] {
  const matches = [...text.matchAll(HEADING_RE)];
  if (matches.length < 2) return [];

  const parts: { label: string; text: string }[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const body = text.slice(start, end).trim();
    if (body.length < 200) continue;
    parts.push({
      label: matches[i][0].trim().slice(0, 80),
      text: body,
    });
  }
  return parts.length >= 2 ? parts : [];
}

function splitBySize(
  text: string,
  size = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): { label: string; text: string }[] {
  const normalized = text.trim();
  if (normalized.length <= size) {
    return [{ label: "Full source", text: normalized }];
  }

  const parts: { label: string; text: string }[] = [];
  let start = 0;
  let index = 1;
  while (start < normalized.length) {
    let end = Math.min(normalized.length, start + size);
    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("。"),
      );
      if (breakAt > size * 0.4) {
        end = start + breakAt + 1;
      }
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      parts.push({ label: `Part ${index}`, text: chunk });
      index += 1;
    }
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }
  return parts;
}

export function allocateCardCounts(
  chunkCount: number,
  totalCards: number,
): number[] {
  const n = Math.max(1, chunkCount);
  const total = Math.min(30, Math.max(3, totalCards));
  const base = Math.floor(total / n);
  const remainder = total % n;
  const counts = Array.from({ length: n }, (_, i) =>
    Math.max(1, base + (i < remainder ? 1 : 0)),
  );

  // Rebalance if Math.max(1,...) inflated past total on many tiny chunks
  let sum = counts.reduce((a, b) => a + b, 0);
  while (sum > total) {
    let trimmed = false;
    for (let i = counts.length - 1; i >= 0 && sum > total; i -= 1) {
      if (counts[i] > 1) {
        counts[i] -= 1;
        sum -= 1;
        trimmed = true;
      }
    }
    if (!trimmed) break;
  }
  while (sum < total) {
    counts[sum % counts.length] += 1;
    sum += 1;
  }
  return counts;
}

/** Cloud can afford more sequential passes; local Ollama cannot. */
export const DEFAULT_MAX_CHUNKS = 8;
export const OLLAMA_MAX_CHUNKS = 2;

export function chunkStudyText(
  text: string,
  totalCards: number,
  options?: { chunkSize?: number; overlap?: number; maxChunks?: number },
): TextChunk[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const headed = splitByHeadings(normalized);
  const raw =
    headed.length >= 2
      ? headed
      : splitBySize(
          normalized,
          options?.chunkSize ?? DEFAULT_CHUNK_SIZE,
          options?.overlap ?? DEFAULT_OVERLAP,
        );

  const maxChunks = Math.max(1, options?.maxChunks ?? DEFAULT_MAX_CHUNKS);
  const capped = raw.slice(0, maxChunks);
  const counts = allocateCardCounts(capped.length, totalCards);

  return capped.map((part, index) => ({
    id: `chunk-${index + 1}`,
    label: part.label,
    text: part.text,
    cardCount: counts[index] ?? 1,
  }));
}
