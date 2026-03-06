import OpenAI from 'openai';
import { zodResponsesFunction, zodTextFormat } from 'openai/helpers/zod';
import type {
  EasyInputMessage,
  ParsedResponse,
  Response,
  ResponseCreateParams,
  ResponseUsage,
} from 'openai/resources/responses/responses';
import { z } from 'zod';
import { appConfig } from '@/server/config/appConfig';
import {
  estimateActualSpendUsd,
  estimateRequestSpendUsd,
  getProjectedJobSpendUsd,
  resolveJobBudget,
  resolveRequestBudget,
} from '@/server/ai/cost-estimator';
import { canEscalateTask, getModelTier, getTaskPolicy, isPremiumModel } from '@/server/ai/model-policy';
import type { BuiltPrompt } from '@/server/ai/prompt-builder';
import { validateStructuredOutput, validateTextOutput, type QualityGateFailure } from '@/server/ai/quality-gates';
import type {
  AIExecutionAttribution,
  AIExecutionBudget,
  AIModelName,
  AIModelTier,
  AITaskType,
} from '@/server/ai/tasks';
import { logger } from '@/server/observability/logger';

type StructuredSchema = z.ZodType<unknown>;

export interface OpenAIClientLike {
  responses: {
    create(body: ResponseCreateParams, options?: { timeout?: number }): Promise<Response>;
    parse<ParsedT = unknown>(
      body: ResponseCreateParams,
      options?: { timeout?: number },
    ): Promise<ParsedResponse<ParsedT>>;
  };
}

interface DailyBudgetState {
  maxUsd: number;
  spentUsd: number;
}

interface OpenAIExecutionServiceOptions {
  client?: OpenAIClientLike;
  getDailyBudgetState?: (attribution: AIExecutionAttribution) => Promise<DailyBudgetState | null>;
}

interface ExecuteRequestBase {
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
  input: string | EasyInputMessage[] | AIFunctionToolOutputInput[];
  previousResponseId?: string | null;
  tools: readonly AIToolDefinition[];
}

type ExecutionMode = 'default' | 'escalated';

interface AttemptState {
  accumulatedCostUsd: number;
  escalationReason?: string;
  model: AIModelName;
  retryCount: number;
  wasEscalated: boolean;
}

interface AttemptTelemetry {
  actualCostUsd: number;
  estimatedCostUsd: number;
  latencyMs: number;
  responseId?: string;
  usage?: ResponseUsage;
}

function toUsageSummary(usage: ResponseUsage | undefined): AIUsageSummary {
  return {
    cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
    totalTokens: usage?.total_tokens ?? 0,
  };
}

function stringifyInput(value: string | EasyInputMessage[] | AIFunctionToolOutputInput[]): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isTransientApiError(error: unknown): boolean {
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

function buildMetadata(
  task: AITaskType,
  model: AIModelName,
  executionMode: ExecutionMode,
  attribution: AIExecutionAttribution | undefined,
  escalationReason: string | undefined,
): Record<string, string> {
  const metadata: Record<string, string> = {
    task,
    model,
    execution_mode: executionMode,
  };

  if (attribution?.requestId) {
    metadata.request_id = attribution.requestId;
  }
  if (attribution?.jobId) {
    metadata.job_id = attribution.jobId;
  }
  if (attribution?.userId) {
    metadata.user_id = attribution.userId;
  }
  if (attribution?.workspaceId) {
    metadata.workspace_id = attribution.workspaceId;
  }
  if (escalationReason) {
    metadata.escalation_reason = escalationReason.slice(0, 200);
  }

  return metadata;
}

const aiExecutionCounters = new Map<string, number>();

function incrementCounter(task: AITaskType, model: AIModelName, executionMode: ExecutionMode): void {
  const key = `${task}:${model}:${executionMode}`;
  aiExecutionCounters.set(key, (aiExecutionCounters.get(key) ?? 0) + 1);
}

export function getAIExecutionCounters(): Record<string, number> {
  return Object.fromEntries(aiExecutionCounters.entries());
}

export class AIExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIExecutionError';
  }
}

export class AIBudgetExceededError extends AIExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'AIBudgetExceededError';
  }
}

export class AIValidationError extends AIExecutionError {
  readonly failure: QualityGateFailure;

  constructor(failure: QualityGateFailure) {
    super(failure.message);
    this.failure = failure;
    this.name = 'AIValidationError';
  }
}

export class OpenAIExecutionService {
  private client?: OpenAIClientLike;
  private readonly getDailyBudgetState?: OpenAIExecutionServiceOptions['getDailyBudgetState'];

  constructor(options: OpenAIExecutionServiceOptions = {}) {
    this.client = options.client;
    this.getDailyBudgetState = options.getDailyBudgetState;
  }

  async executeText(request: ExecuteRequestBase): Promise<AIExecutionResult<string>> {
    const result = await this.runExecution<string>({
      inputValue: request.prompt.input,
      request,
      performAttempt: async (state, requestOptions) => {
        const response = await this.getClient().responses.create(
          this.buildRequestBody({
            task: request.task,
            prompt: request.prompt,
            input: request.prompt.input,
            model: state.model,
            temperature: request.temperature,
            escalationReason: state.escalationReason,
            attribution: request.attribution,
          }),
          requestOptions,
        );

        const textValidation = validateTextOutput(request.task, response.output_text);
        if (!textValidation.ok) {
          throw new AIValidationError(textValidation.failure);
        }

        return {
          actualCostUsd: estimateActualSpendUsd(state.model, response.usage),
          estimatedCostUsd: estimateRequestSpendUsd({
            inputText: `${request.prompt.instructions}\n\n${stringifyInput(request.prompt.input)}`,
            maxOutputTokens: getTaskPolicy(request.task).maxOutputTokens,
            model: state.model,
          }).estimatedTotalUsd,
          output: textValidation.value,
          response,
        };
      },
    });
    return result as AIExecutionResult<string>;
  }

  async executeStructured<TSchema extends StructuredSchema>(
    request: ExecuteStructuredRequest<TSchema>,
  ): Promise<AIExecutionResult<z.infer<TSchema>>> {
    const result = await this.runExecution<z.infer<TSchema>>({
      inputValue: request.prompt.input,
      request,
      performAttempt: async (state, requestOptions) => {
        const response = await this.getClient().responses.parse<z.infer<TSchema>>(
          {
            ...this.buildRequestBody({
              task: request.task,
              prompt: request.prompt,
              input: request.prompt.input,
              model: state.model,
              temperature: request.temperature,
              escalationReason: state.escalationReason,
              attribution: request.attribution,
            }),
            text: {
              format: zodTextFormat(request.schema, request.schemaName),
            },
          },
          requestOptions,
        );

        const structuredValidation = validateStructuredOutput(request.schema, response.output_parsed);
        if (!structuredValidation.ok) {
          throw new AIValidationError(structuredValidation.failure);
        }

        return {
          actualCostUsd: estimateActualSpendUsd(state.model, response.usage),
          estimatedCostUsd: estimateRequestSpendUsd({
            inputText: `${request.prompt.instructions}\n\n${stringifyInput(request.prompt.input)}`,
            maxOutputTokens: getTaskPolicy(request.task).maxOutputTokens,
            model: state.model,
          }).estimatedTotalUsd,
          output: structuredValidation.value,
          response,
        };
      },
    });
    return result as AIExecutionResult<z.infer<TSchema>>;
  }

  async executeToolRound(request: ExecuteToolRoundRequest): Promise<AIToolRoundResult> {
    const result = await this.runExecution<AIToolRoundResult>({
      inputValue: request.input,
      request,
      performAttempt: async (state, requestOptions) => {
        const response = await this.getClient().responses.parse(
          {
            ...this.buildRequestBody({
              task: request.task,
              prompt: request.prompt,
              input: request.input,
              model: state.model,
              temperature: request.temperature,
              escalationReason: state.escalationReason,
              attribution: request.attribution,
              previousResponseId: request.previousResponseId,
            }),
            parallel_tool_calls: false,
            tools: request.tools.map((tool) =>
              zodResponsesFunction({
                name: tool.name,
                description: tool.description,
                parameters: tool.schema,
              }),
            ),
          },
          requestOptions,
        );

        const toolCalls = response.output.reduce<AIToolCall[]>((calls, item) => {
          if (item.type !== 'function_call') {
            return calls;
          }

          const parsedItem = item as {
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

        const estimatedCostUsd = estimateRequestSpendUsd({
          inputText: `${request.prompt.instructions}\n\n${stringifyInput(request.input)}`,
          maxOutputTokens: getTaskPolicy(request.task).maxOutputTokens,
          model: state.model,
        }).estimatedTotalUsd;
        const actualCostUsd = estimateActualSpendUsd(state.model, response.usage);

        return {
          actualCostUsd,
          estimatedCostUsd,
          output: {
            actualCostUsd,
            estimatedCostUsd,
            model: state.model,
            outputText: response.output_text.trim(),
            responseId: response.id,
            retryCount: state.retryCount,
            tier: getModelTier(state.model),
            toolCalls,
            usage: toUsageSummary(response.usage),
            wasEscalated: state.wasEscalated,
          },
          response,
        };
      },
    });
    return result as AIToolRoundResult;
  }

  private buildRequestBody(params: {
    attribution?: AIExecutionAttribution;
    escalationReason?: string;
    input: string | EasyInputMessage[] | AIFunctionToolOutputInput[];
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
      metadata: buildMetadata(
        params.task,
        params.model,
        executionMode,
        params.attribution,
        params.escalationReason,
      ),
      previous_response_id: params.previousResponseId ?? undefined,
      prompt_cache_key: params.prompt.promptCacheKey,
      prompt_cache_retention: '24h',
      reasoning: {
        effort: policy.reasoningEffort,
      },
      temperature: params.temperature,
    };
  }

  private async ensureBudgetAllowed(
    request: ExecuteRequestBase,
    state: AttemptState,
    inputValue: string | EasyInputMessage[] | AIFunctionToolOutputInput[],
  ): Promise<number> {
    const policy = getTaskPolicy(request.task);
    const requestEstimate = estimateRequestSpendUsd({
      inputText: `${request.prompt.instructions}\n\n${stringifyInput(inputValue)}`,
      maxOutputTokens: policy.maxOutputTokens,
      model: state.model,
    });
    const maxRequestUsd = resolveRequestBudget(request.budget?.maxRequestUsd);
    const projectedJobSpendUsd = getProjectedJobSpendUsd(
      request.budget,
      requestEstimate.estimatedTotalUsd,
      state.accumulatedCostUsd,
    );
    const maxJobUsd = resolveJobBudget(request.budget?.maxJobUsd);

    if (request.budget?.allowOverBudget !== true && requestEstimate.estimatedTotalUsd > maxRequestUsd) {
      throw new AIBudgetExceededError(
        `Projected request spend $${requestEstimate.estimatedTotalUsd} exceeds max request budget $${maxRequestUsd}.`,
      );
    }

    if (request.budget?.allowOverBudget !== true && projectedJobSpendUsd > maxJobUsd) {
      throw new AIBudgetExceededError(
        `Projected job spend $${projectedJobSpendUsd} exceeds max job budget $${maxJobUsd}.`,
      );
    }

    if (this.getDailyBudgetState && request.budget?.allowOverBudget !== true) {
      const dailyBudgetState = await this.getDailyBudgetState(request.attribution ?? {});
      if (dailyBudgetState) {
        const projectedDailySpend = dailyBudgetState.spentUsd + requestEstimate.estimatedTotalUsd;
        if (projectedDailySpend > dailyBudgetState.maxUsd) {
          throw new AIBudgetExceededError(
            `Projected daily spend $${projectedDailySpend.toFixed(6)} exceeds daily budget $${dailyBudgetState.maxUsd}.`,
          );
        }
      }
    }

    return requestEstimate.estimatedTotalUsd;
  }

  private getClient(): OpenAIClientLike {
    if (this.client) {
      return this.client;
    }

    if (!appConfig.openaiApiKey) {
      throw new AIExecutionError('OPENAI_API_KEY is not configured');
    }

    const nativeFetch =
      typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;

    this.client = new OpenAI({
      apiKey: appConfig.openaiApiKey,
      fetch: nativeFetch,
    });

    return this.client;
  }

  private async runExecution<TOutput>(params: {
    inputValue: string | EasyInputMessage[] | AIFunctionToolOutputInput[];
    performAttempt: (
      state: AttemptState,
      requestOptions: { timeout: number },
    ) => Promise<{
      actualCostUsd: number;
      estimatedCostUsd: number;
      output: TOutput;
      response: Response | ParsedResponse<unknown>;
    }>;
    request: ExecuteRequestBase;
  }): Promise<AIExecutionResult<TOutput> | AIToolRoundResult> {
    const policy = getTaskPolicy(params.request.task);
    let state: AttemptState = {
      accumulatedCostUsd: 0,
      model: policy.defaultModel,
      retryCount: 0,
      wasEscalated: false,
    };

    while (true) {
      const executionMode: ExecutionMode = state.wasEscalated ? 'escalated' : 'default';
      const estimatedCostUsd = await this.ensureBudgetAllowed(
        params.request,
        state,
        params.inputValue,
      );
      const startedAt = Date.now();

      try {
        const attempt = await params.performAttempt(state, { timeout: policy.timeoutMs });
        const latencyMs = Date.now() - startedAt;
        const usage = attempt.response.usage;
        state.accumulatedCostUsd += attempt.actualCostUsd;

        this.logAttempt({
          task: params.request.task,
          model: state.model,
          executionMode,
          escalationReason: state.escalationReason,
          retryCount: state.retryCount,
          latencyMs,
          usage,
          estimatedCostUsd: attempt.estimatedCostUsd,
          actualCostUsd: attempt.actualCostUsd,
          responseId: attempt.response.id,
          attribution: params.request.attribution,
        });

        incrementCounter(params.request.task, state.model, executionMode);

        if (
          typeof attempt.output === 'object' &&
          attempt.output !== null &&
          'responseId' in attempt.output
        ) {
          return attempt.output as unknown as AIToolRoundResult;
        }

        return {
          actualCostUsd: attempt.actualCostUsd,
          estimatedCostUsd,
          model: state.model,
          output: attempt.output,
          responseId: attempt.response.id,
          retryCount: state.retryCount,
          tier: getModelTier(state.model),
          usage: toUsageSummary(usage),
          wasEscalated: state.wasEscalated,
        } as AIExecutionResult<TOutput>;
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const validationFailure = error instanceof AIValidationError ? error.failure : undefined;
        const retryableFailure =
          validationFailure?.retryable === true || isTransientApiError(error);
        const canRetry = retryableFailure && state.retryCount < policy.retryCount;

        this.logFailure({
          task: params.request.task,
          model: state.model,
          executionMode,
          escalationReason: state.escalationReason,
          retryCount: state.retryCount,
          latencyMs,
          estimatedCostUsd,
          error,
          attribution: params.request.attribution,
        });

        if (canRetry) {
          state = {
            ...state,
            retryCount: state.retryCount + 1,
          };
          continue;
        }

        if (
          validationFailure &&
          canEscalateTask(
            params.request.task,
            params.request.allowEscalationOnValidationFailure === true,
          )
        ) {
          const escalationModel = getTaskPolicy(params.request.task).allowedEscalationModel;
          if (!escalationModel) {
            throw error;
          }

          state = {
            accumulatedCostUsd: state.accumulatedCostUsd,
            model: escalationModel,
            retryCount: 0,
            wasEscalated: true,
            escalationReason: validationFailure.message,
          };
          continue;
        }

        throw error;
      }
    }
  }

  private logAttempt(params: {
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
      userId: params.attribution?.userId,
      workspaceId: params.attribution?.workspaceId,
    });
  }

  private logFailure(params: {
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
      userId: params.attribution?.userId,
      workspaceId: params.attribution?.workspaceId,
    });
  }
}

export const openAIExecutionService = new OpenAIExecutionService();

export function assertPremiumAllowed(task: AITaskType, model: AIModelName): void {
  const policy = getTaskPolicy(task);
  if (!isPremiumModel(model)) {
    return;
  }

  const premiumIsDefault = policy.defaultModel === model;
  const premiumIsEscalation = policy.allowedEscalationModel === model;

  if (!premiumIsDefault && !premiumIsEscalation) {
    throw new AIExecutionError(`Task ${task} is not allowed to use premium model ${model}.`);
  }
}
