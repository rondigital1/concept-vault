'use server';

import { client, ensureSchema } from '@/db';
import * as chatHistoryService from '@/server/services/chatHistory.service';
import { revalidatePath } from 'next/cache';

export interface SessionSummary {
  id: string;
  title: string;
  preview: string | null;
  messageCount: number;
  updatedAt: string;
}

export interface SessionWithMessages {
  session: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function listSessionsAction(): Promise<SessionSummary[]> {
  try {
    await ensureSchema(client);
    const sessions = await chatHistoryService.listRecentSessions(50);
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      preview: s.preview,
      messageCount: s.messageCount,
      updatedAt: s.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return [];
  }
}

export async function getSessionAction(
  sessionId: string
): Promise<SessionWithMessages | null> {
  try {
    await ensureSchema(client);
    const data = await chatHistoryService.getSessionWithMessages(sessionId);
    if (!data) {
      return null;
    }
    return {
      session: {
        id: data.session.id,
        title: data.session.title,
        createdAt: data.session.createdAt.toISOString(),
        updatedAt: data.session.updatedAt.toISOString(),
      },
      messages: data.messages,
    };
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

export async function deleteSessionAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSchema(client);
    await chatHistoryService.deleteSession(sessionId);
    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete session',
    };
  }
}

export async function renameSessionAction(
  sessionId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSchema(client);
    await chatHistoryService.renameSession(sessionId, title);
    revalidatePath('/chat');
    return { success: true };
  } catch (error) {
    console.error('Failed to rename session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename session',
    };
  }
}
