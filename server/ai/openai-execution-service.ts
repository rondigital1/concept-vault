import type {
  ParsedResponse,
  Response,
} from 'openai/resources/responses/responses';
import type { z } from 'zod';
import {
  estimateActualSpendUsd,
  estimateRequestSpendUsd,
} from '@/server/ai/cost-estimator';
import { canEscalateTask, getModelTier, getTaskPolicy, isPremiumModel } from '@/server/ai/model-policy';
import type { AIModelName, AITaskType } from '@/server/ai/tasks';
import { logger } from '@/server/observability/logger';
import {
  buildOpenAIRequestBody,
  buildOpenAIStructuredTextFormat,
  buildOpenAITools,
  createOpenAIClient,
} from '@/server/ai/openai-provider';
import {
  extractOpenAIToolCalls,
  isTransientOpenAIError,
  stringifyOpenAIInput,
  toUsageSummary,
  validateOpenAIStructuredOutput,
  validateOpenAITextOutput,
} from '@/server/ai/openai-output-parsing';
import { ensureOpenAIExecutionBudgetAllowed } from '@/server/ai/openai-execution-budget';
import {
  incrementAIExecutionCounter,
  logAIExecutionAttempt,
  logAIExecutionFailure,
  persistAIExecutionAuditRecord,
  resolveAIExecutionRunId,
} from '@/server/ai/openai-execution-telemetry';
import {
  AIExecutionError,
  AIValidationError,
} from '@/server/ai/openai-execution.errors';
import type {
  AIExecutionResult,
  AIToolRoundResult,
  AttemptState,
  ExecuteRequestBase,
  ExecuteStructuredRequest,
  ExecuteToolRoundRequest,
  ExecutionMode,
  OpenAIClientLike,
  OpenAIExecutionServiceOptions,
  OpenAIInputValue,
  StructuredSchema,
} from '@/server/ai/openai-execution.types';

export {
  AIBudgetExceededError,
  AIExecutionError,
  AIValidationError,
} from '@/server/ai/openai-execution.errors';
export { getAIExecutionCounters } from '@/server/ai/openai-execution-telemetry';
export type {
  AIFunctionToolOutputInput,
  AIExecutionResult,
  AIToolCall,
  AIToolDefinition,
  AIToolRoundResult,
  AIUsageSummary,
  ExecuteStructuredRequest,
  ExecuteToolRoundRequest,
  OpenAIClientLike,
} from '@/server/ai/openai-execution.types';

type AttemptResponse<TOutput> = {
  actualCostUsd: number;
  estimatedCostUsd: number;
  output: TOutput;
  response: Response | ParsedResponse<unknown>;
};

export class OpenAIExecutionService {
  private client?: OpenAIClientLike;
  private readonly getDailyBudgetState?: OpenAIExecutionServiceOptions['getDailyBudgetState'];

  constructor(options: OpenAIExecutionServiceOptions = {}) {
    this.client = options.client;
    this.getDailyBudgetState = options.getDailyBudgetState;
  }

  async executeText(request: ExecuteRequestBase): Promise<AIExecutionResult<string>> {
    const result = await this.runExecution<string>({
      auditSchemaName: 'text',
      inputValue: request.prompt.input,
      request,
      performAttempt: async (state, requestOptions) => {
        const response = await this.getClient().responses.create(
          buildOpenAIRequestBody({
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
        const output = validateOpenAITextOutput(request.task, response.output_text);

        return {
          actualCostUsd: estimateActualSpendUsd(state.model, response.usage),
          estimatedCostUsd: this.estimateAttemptSpendUsd(request.task, state.model, request.prompt.input, request),
          output,
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
      auditSchemaName: request.schemaName,
      inputValue: request.prompt.input,
      request,
      performAttempt: async (state, requestOptions) => {
        const response = await this.getClient().responses.parse<z.infer<TSchema>>(
          {
            ...buildOpenAIRequestBody({
              task: request.task,
              prompt: request.prompt,
              input: request.prompt.input,
              model: state.model,
              temperature: request.temperature,
              escalationReason: state.escalationReason,
              attribution: request.attribution,
            }),
            text: {
              format: buildOpenAIStructuredTextFormat(request.schema, request.schemaName),
            },
          },
          requestOptions,
        );
        const output = validateOpenAIStructuredOutput(request.schema, response.output_parsed);

        return {
          actualCostUsd: estimateActualSpendUsd(state.model, response.usage),
          estimatedCostUsd: this.estimateAttemptSpendUsd(request.task, state.model, request.prompt.input, request),
          output,
          response,
        };
      },
    });

    return result as AIExecutionResult<z.infer<TSchema>>;
  }

  async executeToolRound(request: ExecuteToolRoundRequest): Promise<AIToolRoundResult> {
    const result = await this.runExecution<AIToolRoundResult>({
      auditSchemaName: 'tool_round',
      inputValue: request.input,
      request,
      performAttempt: async (state, requestOptions) => {
        const response = await this.getClient().responses.parse(
          {
            ...buildOpenAIRequestBody({
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
            tools: buildOpenAITools(request.tools),
          },
          requestOptions,
        );
        const toolCalls = extractOpenAIToolCalls(response.output);
        const estimatedCostUsd = this.estimateAttemptSpendUsd(
          request.task,
          state.model,
          request.input,
          request,
        );
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

  private getClient(): OpenAIClientLike {
    if (this.client) {
      return this.client;
    }

    this.client = createOpenAIClient();
    return this.client;
  }

  private estimateAttemptSpendUsd(
    task: AITaskType,
    model: AIModelName,
    inputValue: OpenAIInputValue,
    request: ExecuteRequestBase,
  ): number {
    return estimateRequestSpendUsd({
      inputText: `${request.prompt.instructions}\n\n${stringifyOpenAIInput(inputValue)}`,
      maxOutputTokens: getTaskPolicy(task).maxOutputTokens,
      model,
    }).estimatedTotalUsd;
  }

  private async runExecution<TOutput>(params: {
    auditSchemaName: string;
    inputValue: OpenAIInputValue;
    performAttempt: (
      state: AttemptState,
      requestOptions: { timeout: number },
    ) => Promise<AttemptResponse<TOutput>>;
    request: ExecuteRequestBase;
  }): Promise<AIExecutionResult<TOutput> | AIToolRoundResult> {
    const policy = getTaskPolicy(params.request.task);

    return logger.withContext(
      {
        jobId: params.request.attribution?.jobId,
        requestId: params.request.attribution?.requestId,
        runId: resolveAIExecutionRunId(params.request.attribution),
        stepId: params.request.attribution?.stepId,
        userId: params.request.attribution?.userId,
        workspaceId: params.request.attribution?.workspaceId,
      },
      async () => {
        let state: AttemptState = {
          accumulatedCostUsd: 0,
          model: policy.defaultModel,
          retryCount: 0,
          wasEscalated: false,
        };

        while (true) {
          const executionMode: ExecutionMode = state.wasEscalated ? 'escalated' : 'default';
          const estimatedCostUsd = await ensureOpenAIExecutionBudgetAllowed({
            getDailyBudgetState: this.getDailyBudgetState,
            inputValue: params.inputValue,
            request: params.request,
            state,
          });
          const startedAt = Date.now();

          try {
            const attempt = await params.performAttempt(state, { timeout: policy.timeoutMs });
            const latencyMs = Date.now() - startedAt;
            const usage = attempt.response.usage;
            state.accumulatedCostUsd += attempt.actualCostUsd;

            await persistAIExecutionAuditRecord({
              request: params.request,
              inputValue: params.inputValue,
              schemaName: params.auditSchemaName,
              state,
              status: 'ok',
              telemetry: {
                actualCostUsd: attempt.actualCostUsd,
                estimatedCostUsd: attempt.estimatedCostUsd,
                latencyMs,
                responseId: attempt.response.id,
                usage,
              },
              outputText: attempt.response.output_text,
            });

            logAIExecutionAttempt({
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

            incrementAIExecutionCounter(params.request.task, state.model, executionMode);

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
              validationFailure?.retryable === true || isTransientOpenAIError(error);
            const canRetry = retryableFailure && state.retryCount < policy.retryCount;

            await persistAIExecutionAuditRecord({
              request: params.request,
              inputValue: params.inputValue,
              schemaName: params.auditSchemaName,
              state,
              status: 'error',
              telemetry: {
                actualCostUsd: 0,
                estimatedCostUsd,
                latencyMs,
              },
              error,
            });

            logAIExecutionFailure({
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
      },
    );
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
