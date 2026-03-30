export const AI_MODELS = {
  DEFAULT: 'gpt-5-mini',
  PREMIUM: 'gpt-5.4',
} as const;

export type AIModelName = (typeof AI_MODELS)[keyof typeof AI_MODELS];

export const AI_MODEL_TIERS = {
  DEFAULT: 'default',
  PREMIUM: 'premium',
} as const;

export type AIModelTier = (typeof AI_MODEL_TIERS)[keyof typeof AI_MODEL_TIERS];

export const AI_TASKS = {
  classifyDocument: 'classify_document',
  tagDocument: 'tag_document',
  extractStructuredMetadata: 'extract_structured_metadata',
  rewriteQuery: 'rewrite_query',
  summarizeSimple: 'summarize_simple',
  distillDocument: 'distill_document',
  compareDocuments: 'compare_documents',
  generateReportDraft: 'generate_report_draft',
  generateFinalReport: 'generate_final_report',
  refineFinalReport: 'refine_final_report',
  generateFlashcards: 'generate_flashcards',
  chatAssistant: 'chat_assistant',
  generatePromptSuggestions: 'generate_prompt_suggestions',
  evaluateWebResult: 'evaluate_web_result',
  webResearchAgent: 'web_research_agent',
} as const;

export type AITaskType = (typeof AI_TASKS)[keyof typeof AI_TASKS];

export interface AIExecutionAttribution {
  requestId?: string;
  jobId?: string;
  userId?: string;
  workspaceId?: string;
}

export interface AIExecutionBudget {
  allowOverBudget?: boolean;
  maxJobUsd?: number;
  maxRequestUsd?: number;
  spentJobUsd?: number;
}
