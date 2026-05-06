import type { ResponseUsage } from 'openai/resources/responses/responses';
import type { z } from 'zod';
import type {
  AIToolCall,
  AIUsageSummary,
  OpenAIInputValue,
  StructuredSchema,
} from '@/server/ai/openai-execution.types';
import { validateStructuredOutput, validateTextOutput } from '@/server/ai/quality-gates';
import type { AITaskType } from '@/server/ai/tasks';
import { AIValidationError } from '@/server/ai/openai-execution.errors';

export function toUsageSummary(usage: ResponseUsage | undefined): AIUsageSummary {
  return {
    cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };
}

export function stringifyOpenAIInput(value: OpenAIInputValue): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

export function validateOpenAITextOutput(task: AITaskType, outputText: string): string {
  const textValidation = validateTextOutput(task, outputText);

  if (!textValidation.ok) {
    throw new AIValidationError(textValidation.failure);
  }

  return textValidation.value;
}

export function validateOpenAIStructuredOutput<TSchema extends StructuredSchema>(
  schema: TSchema,
  output: unknown,
): z.infer<TSchema> {
  const structuredValidation = validateStructuredOutput(schema, output);

  if (!structuredValidation.ok) {
    throw new AIValidationError(structuredValidation.failure);
  }

  return structuredValidation.value as z.infer<TSchema>;
}

export function extractOpenAIToolCalls(output: Array<{ type: string }>): AIToolCall[] {
  return output.reduce<AIToolCall[]>((calls, item) => {
    if (item.type !== 'function_call') {
      return calls;
    }

    const parsedItem = item as unknown as {
      arguments: unknown;
      call_id: string;
      name: string;
      parsed_arguments?: unknown;
    };

    calls.push({
      name: parsedItem.name,
      callId: parsedItem.call_id,
      arguments:
        'parsed_arguments' in parsedItem
          ? parsedItem.parsed_arguments
          : parsedItem.arguments,
    });

    return calls;
  }, []);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isTransientOpenAIError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const status = 'status' in error ? error.status : undefined;

  if (typeof status === 'number') {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  const message = errorMessage(error).toLowerCase();

  return (
    message.includes('timeout') ||
    message.includes('temporarily unavailable') ||
    message.includes('connection') ||
    message.includes('rate limit')
  );
}
