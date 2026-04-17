import type { AIExecutionBudget } from '@/server/ai/tasks';

export const AI_BUDGETS = {
  categorizeDocument: {
    maxRequestUsd: 0.01,
    maxJobUsd: 0.03,
  },
  distillConcepts: {
    maxRequestUsd: 0.08,
    maxJobUsd: 0.4,
  },
  distillFlashcards: {
    maxRequestUsd: 0.05,
    maxJobUsd: 0.3,
  },
  reportSynthesis: {
    maxRequestUsd: 0.25,
    maxJobUsd: 0.5,
  },
  rewriteQuery: {
    maxRequestUsd: 0.01,
    maxJobUsd: 0.03,
  },
  tagDocument: {
    maxRequestUsd: 0.02,
    maxJobUsd: 0.05,
  },
  webResearchAgent: {
    maxRequestUsd: 0.12,
    maxJobUsd: 0.6,
  },
  webResultEvaluation: {
    maxRequestUsd: 0.03,
    maxJobUsd: 0.08,
  },
} as const satisfies Record<string, AIExecutionBudget>;
