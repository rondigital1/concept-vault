'use server';

import { callLLM, LLMMessage } from '@/server/llm/modelGateway';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatAction(currentMessage: string, history: ChatMessage[]) {
  try {
    // Convert history and current message to LLMMessage[]
    const messages: LLMMessage[] = [
      ...history.map(msg => ({ role: msg.role, content: msg.content } as LLMMessage)),
      { role: 'user', content: currentMessage }
    ];
    const response = await callLLM(messages);

    return response.content;
  } catch (error) {
    console.error('Chat action error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to process chat request');
  }
}
