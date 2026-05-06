import OpenAI from 'openai';
import { zodResponsesFunction, zodTextFormat } from 'openai/helpers/zod';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';
import { appConfig } from '@/server/config/appConfig';
import { getTaskPolicy } from '@/server/ai/model-policy';
import type {
  AIExecutionAttribution,
  AIModelName,
  AITaskType,
} from '@/server/ai/tasks';
import type {
  AIToolDefinition,
  ExecutionMode,
  OpenAIClientLike,
  OpenAIInputValue,
  StructuredSchema,
} from '@/server/ai/openai-execution.types';
import { AIExecutionError } from '@/server/ai/openai-execution.errors';
import type { BuiltPrompt } from '@/server/ai/prompt-builder';

export function createOpenAIClient(): OpenAIClientLike {
  if (!appConfig.openaiApiKey) {
    throw new AIExecutionError('OPENAI_API_KEY is not configured');
  }

  const nativeFetch =
    typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;

  return new OpenAI({
    apiKey: appConfig.openaiApiKey,
    fetch: nativeFetch,
  });
}

function buildOpenAIMetadata(params: {
  task: AITaskType;
  model: AIModelName;
  executionMode: ExecutionMode;
  attribution?: AIExecutionAttribution;
  escalationReason?: string;
}): Record<string, string> {
  const metadata: Record<string, string> = {
    task: params.task,
    model: params.model,
    execution_mode: params.executionMode,
  };

  if (params.attribution?.requestId) {
    metadata.request_id = params.attribution.requestId;
  }

  if (params.attribution?.jobId) {
    metadata.job_id = params.attribution.jobId;
  }

  if (params.attribution?.runId) {
    metadata.run_id = params.attribution.runId;
  }

  if (params.attribution?.stepId) {
    metadata.step_id = params.attribution.stepId;
  }

  if (params.attribution?.userId) {
    metadata.user_id = params.attribution.userId;
  }

  if (params.attribution?.workspaceId) {
    metadata.workspace_id = params.attribution.workspaceId;
  }

  if (params.escalationReason) {
    metadata.escalation_reason = params.escalationReason.slice(0, 200);
  }

  return metadata;
}

export function buildOpenAIRequestBody(params: {
  attribution?: AIExecutionAttribution;
  escalationReason?: string;
  input: OpenAIInputValue;
  model: AIModelName;
  previousResponseId?: string | null;
  prompt: BuiltPrompt;
  task: AITaskType;
  temperature?: number;
}): ResponseCreateParams {
  const policy = getTaskPolicy(params.task);
  const executionMode: ExecutionMode = params.escalationReason ? 'escalated' : 'default';

  return {
    model: params.model,
    instructions: params.prompt.instructions,
    input: params.input,
    max_output_tokens: policy.maxOutputTokens,
    metadata: buildOpenAIMetadata({
      task: params.task,
      model: params.model,
      executionMode,
      attribution: params.attribution,
      escalationReason: params.escalationReason,
    }),
    previous_response_id: params.previousResponseId ?? undefined,
    prompt_cache_key: params.prompt.promptCacheKey,
    prompt_cache_retention: '24h',
    reasoning: {
      effort: policy.reasoningEffort,
    },
    temperature: params.temperature,
  };
}

export function buildOpenAIStructuredTextFormat<TSchema extends StructuredSchema>(
  schema: TSchema,
  schemaName: string,
) {
  return zodTextFormat(schema, schemaName);
}

export function buildOpenAITools(tools: readonly AIToolDefinition[]) {
  return tools.map((tool) =>
    zodResponsesFunction({
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    }),
  );
}
