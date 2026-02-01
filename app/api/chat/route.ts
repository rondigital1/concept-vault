import { NextResponse } from 'next/server';
import { createChatModel } from '@/server/langchain/models';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { localKbTool } from '@/server/tools/localKb.tool';

export const runtime = 'nodejs';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Query the knowledge base for relevant context
    const kbResults = await localKbTool({
      query: message,
      limit: 3,
    });

    // Build context from knowledge base results
    const contextText = kbResults.length > 0
      ? `\n\nRelevant information from your knowledge base:\n${kbResults
          .map((r, i) => `${i + 1}. ${r.content} (relevance: ${r.score.toFixed(2)})`)
          .join('\n')}`
      : '';

    // Convert chat history to LLM format (last 10 messages for context)
    const recentHistory = history.slice(-10);
    const model = createChatModel({ temperature: 0.7, maxTokens: 1000 });

    const messages = [
      new SystemMessage(`You are a helpful knowledge assistant for a personal knowledge vault called Concept Vault. You help users explore and understand their stored documents and concepts.

Your responses should be:
- Clear and concise
- Helpful and informative
- Based on the knowledge base when relevant
- Conversational but professional

When you don't have specific information from the knowledge base, you can still help the user think through their questions or provide general guidance.${contextText}`),
      ...recentHistory.map((msg) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      new HumanMessage(message),
    ];

    // Call the LLM
    const response = await model.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return NextResponse.json({
      message: content,
      usage: response.usage_metadata,
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'CHAT_API_FAILED', message: errorMessage },
      { status: 500 }
    );
  }
}
