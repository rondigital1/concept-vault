import { appConfig } from '@/server/config/appConfig';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// Initialize clients lazily
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!appConfig.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey: appConfig.openaiApiKey });
  }
  return openaiClient;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!appConfig.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropicClient = new Anthropic({ apiKey: appConfig.anthropicApiKey });
  }

  return anthropicClient;
}

async function callOpenAI(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const client = getOpenAIClient();
  const model = options.model || appConfig.modelName;

  const response = await client.chat.completions.create({
    model,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new Error('No content in OpenAI response');
  }

  return {
    content: choice.message.content,
    usage: response.usage
      ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      }
      : undefined,
  };
}

async function callAnthropic(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const client = getAnthropicClient();
  const model = options.model || 'claude-3-5-sonnet-20241022';

  // Anthropic requires system messages to be separate
  const systemMessage = messages.find((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.7,
    system: systemMessage?.content,
    messages: conversationMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Anthropic response');
  }

  return {
    content: textBlock.text,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
  };
}

export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  const provider = appConfig.modelProvider;

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(messages, options);
      case 'anthropic':
        return await callAnthropic(messages, options);
      default:
        throw new Error(`Unsupported model provider: ${provider}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`LLM call failed: ${error.message}`);
    }
    throw error;
  }
}
