import { AI_MODELS, AI_MODEL_TIERS, type AIModelName, type AIModelTier, AI_TASKS, type AITaskType } from '@/server/ai/tasks';

export type AIReasoningEffort = 'minimal' | 'low' | 'medium';

export interface AITaskPolicy {
  allowedEscalationModel: AIModelName | null;
  defaultModel: AIModelName;
  maxOutputTokens: number;
  reasoningEffort: AIReasoningEffort;
  retryCount: number;
  structuredOutput: boolean;
  timeoutMs: number;
}

const DEFAULT_MODEL = AI_MODELS.DEFAULT;
const PREMIUM_MODEL = AI_MODELS.PREMIUM;

export const AI_TASK_POLICY: Record<AITaskType, AITaskPolicy> = {
  [AI_TASKS.classifyDocument]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'minimal',
    maxOutputTokens: 250,
    timeoutMs: 15_000,
    retryCount: 1,
    structuredOutput: true,
  },
  [AI_TASKS.tagDocument]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'minimal',
    maxOutputTokens: 400,
    timeoutMs: 15_000,
    retryCount: 1,
    structuredOutput: true,
  },
  [AI_TASKS.extractStructuredMetadata]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'minimal',
    maxOutputTokens: 900,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: true,
  },
  [AI_TASKS.rewriteQuery]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'minimal',
    maxOutputTokens: 120,
    timeoutMs: 12_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.summarizeSimple]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: PREMIUM_MODEL,
    reasoningEffort: 'low',
    maxOutputTokens: 1_000,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.distillDocument]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: PREMIUM_MODEL,
    reasoningEffort: 'low',
    maxOutputTokens: 1_400,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: true,
  },
  [AI_TASKS.compareDocuments]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: PREMIUM_MODEL,
    reasoningEffort: 'low',
    maxOutputTokens: 1_200,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: true,
  },
  [AI_TASKS.generateReportDraft]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: PREMIUM_MODEL,
    reasoningEffort: 'low',
    maxOutputTokens: 2_200,
    timeoutMs: 30_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.generateFinalReport]: {
    defaultModel: PREMIUM_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'medium',
    maxOutputTokens: 4_000,
    timeoutMs: 45_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.refineFinalReport]: {
    defaultModel: PREMIUM_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'medium',
    maxOutputTokens: 4_000,
    timeoutMs: 45_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.generateFlashcards]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'low',
    maxOutputTokens: 1_200,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: true,
  },
  [AI_TASKS.chatAssistant]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'low',
    maxOutputTokens: 1_200,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.generatePromptSuggestions]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'minimal',
    maxOutputTokens: 250,
    timeoutMs: 12_000,
    retryCount: 1,
    structuredOutput: false,
  },
  [AI_TASKS.webResearchAgent]: {
    defaultModel: DEFAULT_MODEL,
    allowedEscalationModel: null,
    reasoningEffort: 'low',
    maxOutputTokens: 1_000,
    timeoutMs: 20_000,
    retryCount: 1,
    structuredOutput: false,
  },
};

export function getTaskPolicy(task: AITaskType): AITaskPolicy {
  return AI_TASK_POLICY[task];
}

export function getModelTier(model: AIModelName): AIModelTier {
  if (model === AI_MODELS.PREMIUM) {
    return AI_MODEL_TIERS.PREMIUM;
  }

  return AI_MODEL_TIERS.DEFAULT;
}

export function isPremiumModel(model: AIModelName): boolean {
  return getModelTier(model) === AI_MODEL_TIERS.PREMIUM;
}

export function canEscalateTask(
  task: AITaskType,
  allowEscalationOnValidationFailure: boolean,
): boolean {
  const policy = getTaskPolicy(task);

  if (!allowEscalationOnValidationFailure) {
    return false;
  }

  return policy.allowedEscalationModel !== null;
}
