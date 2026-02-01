/**
 * PostgreSQL-backed chat history for LangChain.
 *
 * Provides persistent conversation memory across sessions using the chat_history table.
 */
import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { sql } from '@/db';

interface StoredMessage {
  id: string;
  session_id: string;
  message: {
    type: string;
    content: string;
    additional_kwargs?: Record<string, unknown>;
  };
  created_at: string;
}

/**
 * PostgreSQL-backed chat message history.
 * Stores and retrieves messages from the chat_history table.
 */
export class PostgresChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message', 'postgres'];

  private sessionId: string;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }

  /**
   * Get all messages for this session.
   */
  async getMessages(): Promise<BaseMessage[]> {
    const rows = await sql<StoredMessage[]>`
      SELECT id, session_id, message, created_at
      FROM chat_history
      WHERE session_id = ${this.sessionId}::uuid
      ORDER BY created_at ASC
    `;

    return rows.map((row) => this.deserializeMessage(row.message));
  }

  /**
   * Add a message to the history.
   */
  async addMessage(message: BaseMessage): Promise<void> {
    const serialized = this.serializeMessage(message);

    await sql`
      INSERT INTO chat_history (session_id, message)
      VALUES (${this.sessionId}::uuid, ${serialized as any})
    `;
  }

  /**
   * Add multiple messages at once.
   */
  async addMessages(messages: BaseMessage[]): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message);
    }
  }

  /**
   * Clear all messages for this session.
   */
  async clear(): Promise<void> {
    await sql`
      DELETE FROM chat_history
      WHERE session_id = ${this.sessionId}::uuid
    `;
  }

  private serializeMessage(message: BaseMessage): {
    type: string;
    content: string;
    additional_kwargs?: Record<string, unknown>;
  } {
    return {
      type: message._getType(),
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      additional_kwargs: message.additional_kwargs,
    };
  }

  private deserializeMessage(stored: {
    type: string;
    content: string;
    additional_kwargs?: Record<string, unknown>;
  }): BaseMessage {
    const additionalKwargs = stored.additional_kwargs ?? {};

    switch (stored.type) {
      case 'human':
        return new HumanMessage({
          content: stored.content,
          additional_kwargs: additionalKwargs,
        });
      case 'ai':
        return new AIMessage({
          content: stored.content,
          additional_kwargs: additionalKwargs,
        });
      case 'system':
        return new SystemMessage({
          content: stored.content,
          additional_kwargs: additionalKwargs,
        });
      default:
        // Fallback to human message for unknown types
        return new HumanMessage({
          content: stored.content,
          additional_kwargs: additionalKwargs,
        });
    }
  }
}

/**
 * Create a chat history instance for a session.
 */
export function createChatHistory(sessionId: string): PostgresChatMessageHistory {
  return new PostgresChatMessageHistory(sessionId);
}

/**
 * Get the number of messages in a session.
 */
export async function getMessageCount(sessionId: string): Promise<number> {
  const rows = await sql<Array<{ count: string }>>`
    SELECT COUNT(*) as count
    FROM chat_history
    WHERE session_id = ${sessionId}::uuid
  `;
  return parseInt(rows[0]?.count ?? '0', 10);
}

/**
 * Delete old sessions (for cleanup).
 */
export async function deleteOldSessions(olderThanDays: number): Promise<number> {
  const result = await sql`
    DELETE FROM chat_sessions
    WHERE created_at < NOW() - INTERVAL '1 day' * ${olderThanDays}
    RETURNING id
  `;
  return result.length;
}
