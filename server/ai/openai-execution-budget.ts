import {
  estimateRequestSpendUsd,
  getProjectedJobSpendUsd,
  resolveJobBudget,
  resolveRequestBudget,
} from '@/server/ai/cost-estimator';
import { getTaskPolicy } from '@/server/ai/model-policy';
import { logger } from '@/server/observability/logger';
import type {
  AttemptState,
  DailyBudgetState,
  ExecuteRequestBase,
  OpenAIInputValue,
} from '@/server/ai/openai-execution.types';
import { stringifyOpenAIInput } from '@/server/ai/openai-output-parsing';
import { AIBudgetExceededError } from '@/server/ai/openai-execution.errors';

export async function ensureOpenAIExecutionBudgetAllowed(params: {
  getDailyBudgetState?: (attribution: NonNullable<ExecuteRequestBase['attribution']>) => Promise<DailyBudgetState | null>;
  inputValue: OpenAIInputValue;
  request: ExecuteRequestBase;
  state: AttemptState;
}): Promise<number> {
  const policy = getTaskPolicy(params.request.task);
  const requestEstimate = estimateRequestSpendUsd({
    inputText: `${params.request.prompt.instructions}\n\n${stringifyOpenAIInput(params.inputValue)}`,
    maxOutputTokens: policy.maxOutputTokens,
    model: params.state.model,
  });
  const maxRequestUsd = resolveRequestBudget(params.request.budget?.maxRequestUsd);
  const projectedJobSpendUsd = getProjectedJobSpendUsd(
    params.request.budget,
    requestEstimate.estimatedTotalUsd,
    params.state.accumulatedCostUsd,
  );
  const maxJobUsd = resolveJobBudget(params.request.budget?.maxJobUsd);
  const budgetMeta = {
    attribution: params.request.attribution,
    model: params.state.model,
    task: params.request.task,
    retryCount: params.state.retryCount,
    estimatedRequestUsd: requestEstimate.estimatedTotalUsd,
    projectedJobSpendUsd,
    maxRequestUsd,
    maxJobUsd,
    spentJobUsd: params.request.budget?.spentJobUsd ?? 0,
  };

  if (params.request.budget?.allowOverBudget !== true && requestEstimate.estimatedTotalUsd > maxRequestUsd) {
    logger.warn('ai.budget.exceeded', {
      ...budgetMeta,
      budgetScope: 'request',
    });
    throw new AIBudgetExceededError(
      `Projected request spend $${requestEstimate.estimatedTotalUsd} exceeds max request budget $${maxRequestUsd}.`,
    );
  }

  if (params.request.budget?.allowOverBudget !== true && projectedJobSpendUsd > maxJobUsd) {
    logger.warn('ai.budget.exceeded', {
      ...budgetMeta,
      budgetScope: 'job',
    });
    throw new AIBudgetExceededError(
      `Projected job spend $${projectedJobSpendUsd} exceeds max job budget $${maxJobUsd}.`,
    );
  }

  if (params.getDailyBudgetState && params.request.budget?.allowOverBudget !== true) {
    const dailyBudgetState = await params.getDailyBudgetState(params.request.attribution ?? {});

    if (dailyBudgetState) {
      const projectedDailySpend = dailyBudgetState.spentUsd + requestEstimate.estimatedTotalUsd;

      if (projectedDailySpend > dailyBudgetState.maxUsd) {
        logger.warn('ai.budget.exceeded', {
          ...budgetMeta,
          budgetScope: 'daily',
          dailyBudgetUsd: dailyBudgetState.maxUsd,
          projectedDailySpendUsd: projectedDailySpend,
          spentDailyUsd: dailyBudgetState.spentUsd,
        });
        throw new AIBudgetExceededError(
          `Projected daily spend $${projectedDailySpend.toFixed(6)} exceeds daily budget $${dailyBudgetState.maxUsd}.`,
        );
      }
    }
  }

  return requestEstimate.estimatedTotalUsd;
}
