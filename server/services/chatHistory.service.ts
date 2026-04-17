/**
 * Chat History Service
 *
 * Business logic for chat session management and message persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
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
  scope: WorkspaceScope,
  sessionId: string | null
): Promise<ChatSession> {
  if (sessionId) {
    const existing = await chatHistoryRepo.getSession(scope, sessionId);
    if (existing) {
      return rowToSession(existing);
    }
  }

  // Create new session
  const newId = sessionId || uuidv4();
  const defaultTitle = 'New conversation';
  const row = await chatHistoryRepo.createSession(scope, newId, defaultTitle);
  return rowToSession(row);
}

/**
 * Persist a message to the database.
 */
export async function persistMessage(
  scope: WorkspaceScope,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const messageType = role === 'user' ? 'human' : 'ai';
  await chatHistoryRepo.insertMessage(scope, sessionId, { type: messageType, content });
  await chatHistoryRepo.updateSessionTimestamp(scope, sessionId);
}

/**
 * Get a session with all its messages.
 */
export async function getSessionWithMessages(
  scope: WorkspaceScope,
  sessionId: string
): Promise<SessionWithMessages | null> {
  const sessionRow = await chatHistoryRepo.getSession(scope, sessionId);
  if (!sessionRow) {
    return null;
  }

  const messageRows = await chatHistoryRepo.getSessionMessages(scope, sessionId);
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
export async function listRecentSessions(
  scope: WorkspaceScope,
  limit = 20,
): Promise<SessionSummary[]> {
  const rows = await chatHistoryRepo.listSessions(scope, limit);
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
export async function deleteSession(scope: WorkspaceScope, sessionId: string): Promise<void> {
  await chatHistoryRepo.deleteSession(scope, sessionId);
}

/**
 * Rename a session.
 */
export async function renameSession(
  scope: WorkspaceScope,
  sessionId: string,
  title: string
): Promise<void> {
  await chatHistoryRepo.updateSessionTitle(scope, sessionId, title);
}

/**
 * Auto-generate session title from first user message.
 */
export async function autoTitleSession(scope: WorkspaceScope, sessionId: string): Promise<void> {
  const firstMessage = await chatHistoryRepo.getFirstUserMessage(scope, sessionId);
  if (firstMessage) {
    const title = truncatePreview(firstMessage, 50);
    await chatHistoryRepo.updateSessionTitle(scope, sessionId, title);
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
