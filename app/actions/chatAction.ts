'use server';

import type { EasyInputMessage } from 'openai/resources/responses/responses';
import { requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import * as chatHistoryService from '@/server/services/chatHistory.service';
import { publicErrorMessage } from '@/server/security/publicError';

export interface ChatActionInput {
  message: string;
  sessionId: string | null;
  reuseLastUserMessage?: boolean;
}

export interface ChatResponse {
  content: string;
  suggestedReplies: string[];
  sessionId: string;
}

export async function chatAction(input: ChatActionInput): Promise<ChatResponse> {
  try {
    const scope = await requireSessionWorkspace();

    // Get or create session
    const session = await chatHistoryService.getOrCreateSession(scope, input.sessionId);
    const isNewSession = !input.sessionId;

    const sessionData = await chatHistoryService.getSessionWithMessages(scope, session.id);
    const history = sessionData?.messages ?? [];
    const lastMessage = history[history.length - 1];
    const canReuseLastUserMessage =
      input.reuseLastUserMessage === true &&
      lastMessage?.role === 'user' &&
      lastMessage.content === input.message;

    if (!canReuseLastUserMessage) {
      await chatHistoryService.persistMessage(scope, session.id, 'user', input.message);
      history.push({ role: 'user', content: input.message });
    }

    // Build LLM messages (exclude the just-added user message since we'll add it explicitly)
    const historyWithoutLast =
      history[history.length - 1]?.role === 'user' ? history.slice(0, -1) : history;

    const systemPrompt = `You are a helpful knowledge assistant.
After your response, please provide 2-4 brief suggested follow-up replies for the user to continue the conversation.
Format these suggestions in an XML block like this:
<suggested_replies>
  <reply>Tell me more about X</reply>
  <reply>What else is related?</reply>
</suggested_replies>
Do not mention the suggestions in your main response text.`;
    const historyMessages: EasyInputMessage[] = historyWithoutLast.map((message) => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    }));
    const prompt = buildPrompt({
      task: AI_TASKS.chatAssistant,
      systemInstructions: [
        {
          heading: 'Role',
          content: systemPrompt,
        },
      ],
      inputMessages: [
        ...historyMessages,
        {
          role: 'user' as const,
          content: input.message,
        },
      ],
    });
    const response = await openAIExecutionService.executeText({
      task: AI_TASKS.chatAssistant,
      prompt,
      temperature: 0.7,
      attribution: {
        jobId: session.id,
        workspaceId: scope.workspaceId,
      },
    });
    let content = response.output;
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
    await chatHistoryService.persistMessage(scope, session.id, 'assistant', content);

    // Auto-title new sessions based on first user message
    if (isNewSession) {
      await chatHistoryService.autoTitleSession(scope, session.id);
    }

    return { content, suggestedReplies, sessionId: session.id };
  } catch (error) {
    console.error('Chat action error:', error);
    throw new Error(publicErrorMessage(error, 'Failed to process chat request'));
  }
}
