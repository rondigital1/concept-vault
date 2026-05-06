import { createHash } from 'node:crypto';
import type { ResponseUsage } from 'openai/resources/responses/responses';
import { getModelTier } from '@/server/ai/model-policy';
import type {
  AIExecutionAttribution,
  AIModelName,
  AITaskType,
} from '@/server/ai/tasks';
import { logger } from '@/server/observability/logger';
import { reportTelemetryError } from '@/server/observability/telemetry';
import { createLlmCall } from '@/server/repos/llmCalls.repo';
import type {
  AttemptState,
  AttemptTelemetry,
  ExecuteRequestBase,
  ExecutionMode,
  OpenAIInputValue,
} from '@/server/ai/openai-execution.types';
import {
  errorMessage,
  stringifyOpenAIInput,
} from '@/server/ai/openai-output-parsing';
import type { BuiltPrompt } from '@/server/ai/prompt-builder';

const aiExecutionCounters = new Map<string, number>();

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function resolveAIExecutionRunId(attribution: AIExecutionAttribution | undefined): string | undefined {
  return attribution?.runId ?? attribution?.jobId ?? undefined;
}

export function buildAuditInputHash(params: {
  inputValue: OpenAIInputValue;
  prompt: BuiltPrompt;
}): string {
  return sha256(`${params.prompt.instructions}\n\n${stringifyOpenAIInput(params.inputValue)}`);
}

export function incrementAIExecutionCounter(
  task: AITaskType,
  model: AIModelName,
  executionMode: ExecutionMode,
): void {
  const key = `${task}:${model}:${executionMode}`;
  aiExecutionCounters.set(key, (aiExecutionCounters.get(key) ?? 0) + 1);
}

export function getAIExecutionCounters(): Record<string, number> {
  return Object.fromEntries(aiExecutionCounters.entries());
}

export async function persistAIExecutionAuditRecord(params: {
  error?: unknown;
  inputValue: OpenAIInputValue;
  outputText?: string;
  request: ExecuteRequestBase;
  schemaName: string;
  state: AttemptState;
  status: 'ok' | 'error';
  telemetry: AttemptTelemetry;
}): Promise<void> {
  const usage = params.telemetry.usage;

  try {
    await createLlmCall({
      runId: resolveAIExecutionRunId(params.request.attribution),
      stepId: params.request.attribution?.stepId ?? null,
      provider: 'openai',
      purpose: params.request.task,
      schemaName: params.schemaName,
      privacyMode: 'redact_basic',
      inputHash: buildAuditInputHash({
        prompt: params.request.prompt,
        inputValue: params.inputValue,
      }),
      outputHash: params.outputText ? sha256(params.outputText) : null,
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      costUsd: params.telemetry.actualCostUsd ?? null,
      status: params.status,
      error: params.error
        ? {
            message: errorMessage(params.error),
            name: params.error instanceof Error ? params.error.name : 'UnknownError',
            retryCount: params.state.retryCount,
          }
        : null,
    });
  } catch (error) {
    logger.error('ai.audit.write_failed', {
      taskType: params.request.task,
      schemaName: params.schemaName,
      errorMessage: errorMessage(error),
      runId: resolveAIExecutionRunId(params.request.attribution),
    });
    await reportTelemetryError({
      timestamp: new Date().toISOString(),
      source: 'openai-execution-service',
      event: 'ai.audit.write_failed',
      taskType: params.request.task,
      schemaName: params.schemaName,
      errorMessage: errorMessage(error),
      runId: resolveAIExecutionRunId(params.request.attribution),
    });
  }
}

export function logAIExecutionAttempt(params: {
  actualCostUsd: number;
  attribution?: AIExecutionAttribution;
  escalationReason?: string;
  estimatedCostUsd: number;
  executionMode: ExecutionMode;
  latencyMs: number;
  model: AIModelName;
  responseId?: string;
  retryCount: number;
  task: AITaskType;
  usage?: ResponseUsage;
}): void {
  logger.info('ai.execution.completed', {
    taskType: params.task,
    selectedModel: params.model,
    modelTier: getModelTier(params.model),
    executionMode: params.executionMode,
    escalationReason: params.escalationReason,
    retryCount: params.retryCount,
    latencyMs: params.latencyMs,
    inputTokens: params.usage?.input_tokens ?? 0,
    outputTokens: params.usage?.output_tokens ?? 0,
    cachedInputTokens: params.usage?.input_tokens_details.cached_tokens ?? 0,
    reasoningTokens: params.usage?.output_tokens_details.reasoning_tokens ?? 0,
    estimatedCostUsd: params.estimatedCostUsd,
    actualCostUsd: params.actualCostUsd,
    responseId: params.responseId,
    requestId: params.attribution?.requestId,
    jobId: params.attribution?.jobId,
    runId: resolveAIExecutionRunId(params.attribution),
    stepId: params.attribution?.stepId,
    userId: params.attribution?.userId,
    workspaceId: params.attribution?.workspaceId,
  });
}

export function logAIExecutionFailure(params: {
  attribution?: AIExecutionAttribution;
  error: unknown;
  escalationReason?: string;
  estimatedCostUsd: number;
  executionMode: ExecutionMode;
  latencyMs: number;
  model: AIModelName;
  retryCount: number;
  task: AITaskType;
}): void {
  logger.warn('ai.execution.failed', {
    taskType: params.task,
    selectedModel: params.model,
    modelTier: getModelTier(params.model),
    executionMode: params.executionMode,
    escalationReason: params.escalationReason,
    retryCount: params.retryCount,
    latencyMs: params.latencyMs,
    estimatedCostUsd: params.estimatedCostUsd,
    errorMessage: errorMessage(params.error),
    errorName: params.error instanceof Error ? params.error.name : 'UnknownError',
    requestId: params.attribution?.requestId,
    jobId: params.attribution?.jobId,
    runId: resolveAIExecutionRunId(params.attribution),
    stepId: params.attribution?.stepId,
    userId: params.attribution?.userId,
    workspaceId: params.attribution?.workspaceId,
  });
}
