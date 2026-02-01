/**
 * Chat History Repository
 *
 * Database operations for chat sessions and message history.
 */

import { sql } from '@/db';

// ---------- Types ----------

export interface ChatSessionRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionWithPreview extends ChatSessionRow {
  preview: string | null;
  message_count: number;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  message: {
    type: string;
    content: string;
    additional_kwargs?: Record<string, unknown>;
  };
  created_at: string;
}

// ---------- Session Operations ----------

/**
 * Create a new chat session
 */
export async function createSession(
  id: string,
  title: string
): Promise<ChatSessionRow> {
  const rows = await sql<ChatSessionRow[]>`
    INSERT INTO chat_sessions (id, title)
    VALUES (${id}::uuid, ${title})
    RETURNING id, title, created_at, updated_at
  `;
  return rows[0];
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<ChatSessionRow | null> {
  const rows = await sql<ChatSessionRow[]>`
    SELECT id, title, created_at, updated_at
    FROM chat_sessions
    WHERE id = ${sessionId}::uuid
  `;
  return rows[0] ?? null;
}

/**
 * List recent sessions with preview
 */
export async function listSessions(limit = 20): Promise<ChatSessionWithPreview[]> {
  const rows = await sql<ChatSessionWithPreview[]>`
    SELECT
      s.id,
      s.title,
      s.created_at,
      s.updated_at,
      (
        SELECT message->>'content'
        FROM chat_history h
        WHERE h.session_id = s.id
          AND h.message->>'type' = 'human'
        ORDER BY h.created_at ASC
        LIMIT 1
      ) as preview,
      (
        SELECT COUNT(*)::int
        FROM chat_history h
        WHERE h.session_id = s.id
      ) as message_count
    FROM chat_sessions s
    ORDER BY s.updated_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Update session title
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  await sql`
    UPDATE chat_sessions
    SET title = ${title}, updated_at = now()
    WHERE id = ${sessionId}::uuid
  `;
}

/**
 * Update session timestamp (called when new messages are added)
 */
export async function updateSessionTimestamp(sessionId: string): Promise<void> {
  await sql`
    UPDATE chat_sessions
    SET updated_at = now()
    WHERE id = ${sessionId}::uuid
  `;
}

/**
 * Delete a session and all its messages (cascade)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await sql`
    DELETE FROM chat_sessions
    WHERE id = ${sessionId}::uuid
  `;
}

// ---------- Message Operations ----------

/**
 * Get all messages for a session
 */
export async function getSessionMessages(
  sessionId: string
): Promise<ChatMessageRow[]> {
  const rows = await sql<ChatMessageRow[]>`
    SELECT id, session_id, message, created_at
    FROM chat_history
    WHERE session_id = ${sessionId}::uuid
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * Add a message to a session
 */
export async function insertMessage(
  sessionId: string,
  message: { type: string; content: string }
): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO chat_history (session_id, message)
    VALUES (${sessionId}::uuid, ${message as any})
    RETURNING id
  `;
  return rows[0].id;
}

/**
 * Get the first user message for a session (for preview/title generation)
 */
export async function getFirstUserMessage(
  sessionId: string
): Promise<string | null> {
  const rows = await sql<Array<{ content: string }>>`
    SELECT message->>'content' as content
    FROM chat_history
    WHERE session_id = ${sessionId}::uuid
      AND message->>'type' = 'human'
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return rows[0]?.content ?? null;
}
