/**
 * Chat History Service
 *
 * Business logic for chat session management and message persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import * as chatHistoryRepo from '@/server/repos/chatHistory.repo';

// ---------- Types ----------

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionWithMessages {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface SessionSummary {
  id: string;
  title: string;
  preview: string | null;
  messageCount: number;
  updatedAt: Date;
}

// ---------- Session Management ----------

/**
 * Get existing session or create a new one.
 * If sessionId is null, creates a new session with a default title.
 */
export async function getOrCreateSession(
  sessionId: string | null
): Promise<ChatSession> {
  if (sessionId) {
    const existing = await chatHistoryRepo.getSession(sessionId);
    if (existing) {
      return rowToSession(existing);
    }
  }

  // Create new session
  const newId = sessionId || uuidv4();
  const defaultTitle = 'New conversation';
  const row = await chatHistoryRepo.createSession(newId, defaultTitle);
  return rowToSession(row);
}

/**
 * Persist a message to the database.
 */
export async function persistMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const messageType = role === 'user' ? 'human' : 'ai';
  await chatHistoryRepo.insertMessage(sessionId, { type: messageType, content });
  await chatHistoryRepo.updateSessionTimestamp(sessionId);
}

/**
 * Get a session with all its messages.
 */
export async function getSessionWithMessages(
  sessionId: string
): Promise<SessionWithMessages | null> {
  const sessionRow = await chatHistoryRepo.getSession(sessionId);
  if (!sessionRow) {
    return null;
  }

  const messageRows = await chatHistoryRepo.getSessionMessages(sessionId);
  const messages: ChatMessage[] = messageRows.map((row) => ({
    role: row.message.type === 'human' ? 'user' : 'assistant',
    content: row.message.content,
  }));

  return {
    session: rowToSession(sessionRow),
    messages,
  };
}

/**
 * List recent sessions for the sidebar.
 */
export async function listRecentSessions(limit = 20): Promise<SessionSummary[]> {
  const rows = await chatHistoryRepo.listSessions(limit);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview ? truncatePreview(row.preview, 60) : null,
    messageCount: row.message_count,
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Delete a session and all its messages.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await chatHistoryRepo.deleteSession(sessionId);
}

/**
 * Rename a session.
 */
export async function renameSession(
  sessionId: string,
  title: string
): Promise<void> {
  await chatHistoryRepo.updateSessionTitle(sessionId, title);
}

/**
 * Auto-generate session title from first user message.
 */
export async function autoTitleSession(sessionId: string): Promise<void> {
  const firstMessage = await chatHistoryRepo.getFirstUserMessage(sessionId);
  if (firstMessage) {
    const title = truncatePreview(firstMessage, 50);
    await chatHistoryRepo.updateSessionTitle(sessionId, title);
  }
}

// ---------- Helpers ----------

function rowToSession(row: chatHistoryRepo.ChatSessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function truncatePreview(text: string, maxLength: number): string {
  const cleaned = text.replace(/\n/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.slice(0, maxLength - 3) + '...';
}
