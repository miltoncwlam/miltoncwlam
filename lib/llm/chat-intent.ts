export const CHAT_MAKE_KINDS = ["cards", "exam", "notes", "mindmap"] as const;
export type ChatMakeKind = (typeof CHAT_MAKE_KINDS)[number];

const MAKE_LINE = /\nMAKE:\s*(cards|exam|notes|mindmap)\s*$/i;

export function parseChatMakeIntent(text: string): {
  reply: string;
  make: ChatMakeKind | null;
} {
  const match = text.match(MAKE_LINE);
  const make = match ? (match[1].toLowerCase() as ChatMakeKind) : null;
  return {
    reply: text.replace(MAKE_LINE, "").trim(),
    make,
  };
}

export function isChatMakeKind(value: string): value is ChatMakeKind {
  return (CHAT_MAKE_KINDS as readonly string[]).includes(value);
}
