import type { AnalyzeFindingsOutput } from '@/server/services/analyzeFindings.service';
import type { PipelineCounts, PipelineError, PipelineInput, PipelineResult, PipelineRunMode } from '@/server/flows/pipeline.types';
import type { ResolvedPipelineTargets } from '@/server/flows/pipeline.targets';

export interface PipelineStageState {
  counts: PipelineCounts;
  artifacts: PipelineResult['artifacts'];
  errors: PipelineError[];
}

export interface PipelineStageContext {
  workspaceId: string;
  runId: string;
  mode: PipelineRunMode;
  input: PipelineInput;
  resolved: ResolvedPipelineTargets;
}

export interface PipelineWebResearchResult {
  webScoutFocusTags: string[];
  analyzedFindings: AnalyzeFindingsOutput | null;
}

export interface PipelinePersistPublishResult {
  reportId: string | null;
  notionPageId: string | null;
}
