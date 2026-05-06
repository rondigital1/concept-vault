import type { RunStatus } from '@/server/observability/runTrace.types';
import type {
  PipelineCounts,
  PipelineError,
  PipelineResult,
  PipelineRunMode,
  PipelineTrigger,
} from '@/server/flows/pipeline.types';

export function createDefaultPipelineCounts(): PipelineCounts {
  return {
    docsTargeted: 0,
    docsCurated: 0,
    docsCurateFailed: 0,
    webProposals: 0,
    analyzedEvidence: 0,
    docsProcessed: 0,
    conceptsProposed: 0,
    flashcardsProposed: 0,
    topicLinksCreated: 0,
  };
}

export function createDefaultPipelineArtifacts(): PipelineResult['artifacts'] {
  return {
    webProposalIds: [],
    analysisArtifactIds: [],
    conceptIds: [],
    flashcardIds: [],
  };
}

export function buildPipelineResult(params: {
  runId: string;
  status: RunStatus;
  mode: PipelineRunMode;
  trigger: PipelineTrigger;
  counts: PipelineCounts;
  artifacts: PipelineResult['artifacts'];
  reportId: string | null;
  notionPageId: string | null;
  errors: PipelineError[];
}): PipelineResult {
  return {
    runId: params.runId,
    status: params.status,
    mode: params.mode,
    trigger: params.trigger,
    counts: params.counts,
    artifacts: params.artifacts,
    reportId: params.reportId,
    notionPageId: params.notionPageId,
    errors: params.errors,
  };
}
