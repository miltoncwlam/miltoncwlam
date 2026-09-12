import "server-only";

import { pool } from "@/lib/db";
import type { NotebookChatMessage } from "@/lib/types/notebook";

export type { NotebookChatMessage };

type ChatRow = {
  id: string;
  deck_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: Date;
};

function mapMessage(row: ChatRow): NotebookChatMessage {
  return {
    id: row.id,
    deckId: row.deck_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function listNotebookChatMessages(
  deckId: string,
  userId: string,
  limit = 40,
): Promise<NotebookChatMessage[]> {
  const result = await pool.query<ChatRow>(
    `select * from notebook_chat_messages
     where deck_id = $1 and user_id = $2
     order by created_at asc
     limit $3`,
    [deckId, userId, Math.min(80, Math.max(1, limit))],
  );
  return result.rows.map(mapMessage);
}

export async function insertNotebookChatMessage(input: {
  deckId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<NotebookChatMessage> {
  const result = await pool.query<ChatRow>(
    `insert into notebook_chat_messages (deck_id, user_id, role, content)
     values ($1, $2, $3, $4)
     returning *`,
    [input.deckId, input.userId, input.role, input.content.slice(0, 4_000)],
  );
  return mapMessage(result.rows[0]);
}
