import type { RunStatus } from '@/server/observability/runTrace.types';

export type PipelineStage =
  | 'resolve_targets'
  | 'topic_setup'
  | 'curate'
  | 'webscout'
  | 'analyze_findings'
  | 'distill'
  | 'synthesize'
  | 'persist_publish';

export type PipelineRunMode =
  | 'full_report'
  | 'incremental_update'
  | 'concept_only'
  | 'scout_only'
  | 'lightweight_enrichment'
  | 'topic_setup'
  | 'skip';

export type PipelineTrigger = 'manual' | 'auto_document' | 'auto_topic' | 'scheduler' | 'cron';

export interface PipelineInput {
  workspaceId?: string;
  day?: string;
  topicId?: string;
  documentIds?: string[];
  limit?: number;
  goal?: string;
  enableCategorization?: boolean;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  runMode?: PipelineRunMode;
  trigger?: PipelineTrigger;
  idempotencyKey?: string;
  enableAutoDistill?: boolean;
  skipPublish?: boolean;
}

export interface PipelineCounts {
  docsTargeted: number;
  docsCurated: number;
  docsCurateFailed: number;
  webProposals: number;
  analyzedEvidence: number;
  docsProcessed: number;
  conceptsProposed: number;
  flashcardsProposed: number;
  topicLinksCreated: number;
}

export interface PipelineError {
  stage: PipelineStage;
  message: string;
  documentId?: string;
}

export interface PipelineResult {
  runId: string;
  status: RunStatus;
  mode: PipelineRunMode;
  trigger: PipelineTrigger;
  counts: PipelineCounts;
  artifacts: {
    webProposalIds: string[];
    analysisArtifactIds: string[];
    conceptIds: string[];
    flashcardIds: string[];
  };
  reportId: string | null;
  notionPageId: string | null;
  errors: PipelineError[];
}

export interface PipelineExecutionOptions {
  runId?: string;
  skipIdempotencyLookup?: boolean;
}
