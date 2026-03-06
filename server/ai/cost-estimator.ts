import type { AIExecutionBudget, AIModelName } from '@/server/ai/tasks';

export interface ModelPricing {
  cachedInputPerMillionUsd: number;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

export interface UsageLike {
  input_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
  output_tokens: number;
}

export interface EstimatedRequestSpend {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalUsd: number;
}

export const MODEL_PRICING_USD_PER_MILLION: Record<AIModelName, ModelPricing> = {
  'gpt-5-mini': {
    inputPerMillionUsd: 0.25,
    cachedInputPerMillionUsd: 0.025,
    outputPerMillionUsd: 2,
  },
  'gpt-5.4': {
    inputPerMillionUsd: 50,
    cachedInputPerMillionUsd: 5,
    outputPerMillionUsd: 200,
  },
};

export const DEFAULT_MAX_REQUEST_USD = 1;
export const DEFAULT_MAX_JOB_USD = 2;

function normalizeUsd(value: number): number {
  return Number(value.toFixed(6));
}

function pricePerToken(usdPerMillion: number): number {
  return usdPerMillion / 1_000_000;
}

export function estimateTokensFromText(value: string): number {
  if (!value.trim()) {
    return 0;
  }

  return Math.ceil(value.length / 4);
}

export function estimateRequestSpendUsd(params: {
  inputText: string;
  maxOutputTokens: number;
  model: AIModelName;
}): EstimatedRequestSpend {
  const pricing = MODEL_PRICING_USD_PER_MILLION[params.model];
  const estimatedInputTokens = estimateTokensFromText(params.inputText);
  const estimatedOutputTokens = params.maxOutputTokens;
  const estimatedTotalUsd =
    estimatedInputTokens * pricePerToken(pricing.inputPerMillionUsd) +
    estimatedOutputTokens * pricePerToken(pricing.outputPerMillionUsd);

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalUsd: normalizeUsd(estimatedTotalUsd),
  };
}

export function estimateActualSpendUsd(model: AIModelName, usage: UsageLike | undefined): number {
  if (!usage) {
    return 0;
  }

  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  const cachedTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  const freshInputTokens = Math.max(usage.input_tokens - cachedTokens, 0);

  const totalUsd =
    freshInputTokens * pricePerToken(pricing.inputPerMillionUsd) +
    cachedTokens * pricePerToken(pricing.cachedInputPerMillionUsd) +
    usage.output_tokens * pricePerToken(pricing.outputPerMillionUsd);

  return normalizeUsd(totalUsd);
}

export function resolveRequestBudget(maxRequestUsd?: number): number {
  if (typeof maxRequestUsd === 'number' && Number.isFinite(maxRequestUsd) && maxRequestUsd > 0) {
    return maxRequestUsd;
  }

  return DEFAULT_MAX_REQUEST_USD;
}

export function resolveJobBudget(maxJobUsd?: number): number {
  if (typeof maxJobUsd === 'number' && Number.isFinite(maxJobUsd) && maxJobUsd > 0) {
    return maxJobUsd;
  }

  return DEFAULT_MAX_JOB_USD;
}

export function getProjectedJobSpendUsd(
  budget: AIExecutionBudget | undefined,
  estimatedRequestUsd: number,
  currentCallSpendUsd: number,
): number {
  const spentJobUsd = budget?.spentJobUsd ?? 0;
  return normalizeUsd(spentJobUsd + currentCallSpendUsd + estimatedRequestUsd);
}
