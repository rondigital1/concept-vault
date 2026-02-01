/**
 * LangChain model factory.
 * Replaces server/llm/modelGateway.ts with LangChain-native implementation.
 */
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { appConfig, ModelProvider } from '@/server/config/appConfig';

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  callbacks?: BaseCallbackHandler[];
}

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Creates a chat model instance based on the configured provider.
 * Supports both OpenAI and Anthropic models.
 */
export function createChatModel(options: ModelOptions = {}): BaseChatModel {
  const provider = appConfig.modelProvider;
  const callbacks = options.callbacks ?? [];

  switch (provider) {
    case 'openai':
      return createOpenAIModel(options, callbacks);
    case 'anthropic':
      return createAnthropicModel(options, callbacks);
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

function createOpenAIModel(
  options: ModelOptions,
  callbacks: BaseCallbackHandler[]
): ChatOpenAI {
  if (!appConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new ChatOpenAI({
    model: options.model ?? appConfig.modelName,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    apiKey: appConfig.openaiApiKey,
    callbacks,
  });
}

function createAnthropicModel(
  options: ModelOptions,
  callbacks: BaseCallbackHandler[]
): ChatAnthropic {
  if (!appConfig.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  return new ChatAnthropic({
    model: options.model ?? 'claude-3-5-sonnet-20241022',
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    anthropicApiKey: appConfig.anthropicApiKey,
    callbacks,
  });
}

/**
 * Creates a model configured for extraction tasks (lower temperature).
 */
export function createExtractionModel(options: ModelOptions = {}): BaseChatModel {
  return createChatModel({
    ...options,
    temperature: options.temperature ?? 0.3,
  });
}

/**
 * Creates a model configured for generation tasks (moderate temperature).
 */
export function createGenerationModel(options: ModelOptions = {}): BaseChatModel {
  return createChatModel({
    ...options,
    temperature: options.temperature ?? 0.7,
  });
}
