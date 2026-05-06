import type {
  EasyInputMessage,
  ParsedResponse,
  Response,
  ResponseCreateParams,
  ResponseUsage,
} from 'openai/resources/responses/responses';
import type { z } from 'zod';
import type { BuiltPrompt } from '@/server/ai/prompt-builder';
import type {
  AIExecutionAttribution,
  AIExecutionBudget,
  AIModelName,
  AIModelTier,
  AITaskType,
} from '@/server/ai/tasks';

export type StructuredSchema = z.ZodType<unknown>;

export interface OpenAIClientLike {
  responses: {
    create(body: ResponseCreateParams, options?: { timeout?: number }): Promise<Response>;
    parse<ParsedT = unknown>(
      body: ResponseCreateParams,
      options?: { timeout?: number },
    ): Promise<ParsedResponse<ParsedT>>;
  };
}

export interface DailyBudgetState {
  maxUsd: number;
  spentUsd: number;
}

export interface OpenAIExecutionServiceOptions {
  client?: OpenAIClientLike;
  getDailyBudgetState?: (attribution: AIExecutionAttribution) => Promise<DailyBudgetState | null>;
}

export interface ExecuteRequestBase {
  allowEscalationOnValidationFailure?: boolean;
  attribution?: AIExecutionAttribution;
  budget?: AIExecutionBudget;
  prompt: BuiltPrompt;
  task: AITaskType;
  temperature?: number;
}

export interface AIFunctionToolOutputInput {
  call_id: string;
  id?: string | null;
  output: string;
  status?: 'completed' | 'in_progress' | 'incomplete';
  type: 'function_call_output';
}

export type OpenAIInputValue = string | EasyInputMessage[] | AIFunctionToolOutputInput[];

export interface AIUsageSummary {
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

export interface AIExecutionResult<TValue> {
  actualCostUsd: number;
  estimatedCostUsd: number;
  model: AIModelName;
  output: TValue;
  responseId: string;
  retryCount: number;
  tier: AIModelTier;
  usage: AIUsageSummary;
  wasEscalated: boolean;
}

export interface AIToolDefinition<TSchema extends StructuredSchema = StructuredSchema> {
  description: string;
  name: string;
  schema: TSchema;
}

export interface AIToolCall {
  arguments: unknown;
  callId: string;
  name: string;
}

export interface AIToolRoundResult {
  actualCostUsd: number;
  estimatedCostUsd: number;
  model: AIModelName;
  outputText: string;
  responseId: string;
  retryCount: number;
  tier: AIModelTier;
  toolCalls: AIToolCall[];
  usage: AIUsageSummary;
  wasEscalated: boolean;
}

export interface ExecuteStructuredRequest<TSchema extends StructuredSchema> extends ExecuteRequestBase {
  schema: TSchema;
  schemaName: string;
}

export interface ExecuteToolRoundRequest extends ExecuteRequestBase {
  input: OpenAIInputValue;
  previousResponseId?: string | null;
  tools: readonly AIToolDefinition[];
}

export type ExecutionMode = 'default' | 'escalated';

export interface AttemptState {
  accumulatedCostUsd: number;
  escalationReason?: string;
  model: AIModelName;
  retryCount: number;
  wasEscalated: boolean;
}

export interface AttemptTelemetry {
  actualCostUsd: number;
  estimatedCostUsd: number;
  latencyMs: number;
  responseId?: string;
  usage?: ResponseUsage;
}
