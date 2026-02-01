'use server';

import { client, ensureSchema } from '@/db';
import { createChatModel } from '@/server/langchain/models';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import * as chatHistoryService from '@/server/services/chatHistory.service';

export interface ChatActionInput {
  message: string;
  sessionId: string | null;
}

export interface ChatResponse {
  content: string;
  suggestedReplies: string[];
  sessionId: string;
}

export async function chatAction(input: ChatActionInput): Promise<ChatResponse> {
  try {
    await ensureSchema(client);

    // Get or create session
    const session = await chatHistoryService.getOrCreateSession(input.sessionId);
    const isNewSession = !input.sessionId;

    // Persist user message
    await chatHistoryService.persistMessage(session.id, 'user', input.message);

    // Load history from database
    const sessionData = await chatHistoryService.getSessionWithMessages(session.id);
    const history = sessionData?.messages ?? [];

    // Build LLM messages (exclude the just-added user message since we'll add it explicitly)
    const historyWithoutLast = history.slice(0, -1);

    const systemPrompt = `You are a helpful knowledge assistant.
After your response, please provide 2-4 brief suggested follow-up replies for the user to continue the conversation.
Format these suggestions in an XML block like this:
<suggested_replies>
  <reply>Tell me more about X</reply>
  <reply>What else is related?</reply>
</suggested_replies>
Do not mention the suggestions in your main response text.`;

    const model = createChatModel({ temperature: 0.7 });

    const messages = [
      new SystemMessage(systemPrompt),
      ...historyWithoutLast.map(msg =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(input.message)
    ];

    const response = await model.invoke(messages);
    let content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    let suggestedReplies: string[] = [];

    // Parse suggested replies
    const suggestionsMatch = content.match(/<suggested_replies>([\s\S]*?)<\/suggested_replies>/);
    if (suggestionsMatch && suggestionsMatch[1]) {
      const suggestionsBlock = suggestionsMatch[1];
      const replyMatches = suggestionsBlock.matchAll(/<reply>(.*?)<\/reply>/g);
      suggestedReplies = Array.from(replyMatches, (m: RegExpMatchArray) => m[1].trim());

      // Remove the XML block from the content
      content = content.replace(/<suggested_replies>[\s\S]*?<\/suggested_replies>/, '').trim();
    }

    // Persist assistant response
    await chatHistoryService.persistMessage(session.id, 'assistant', content);

    // Auto-title new sessions based on first user message
    if (isNewSession) {
      await chatHistoryService.autoTitleSession(session.id);
    }

    return { content, suggestedReplies, sessionId: session.id };
  } catch (error) {
    console.error('Chat action error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to process chat request');
  }
}
