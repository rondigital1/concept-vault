import type { AnalyzeFindingsOutput } from '@/server/services/analyzeFindings.service';
import type { RunStatus } from '@/server/observability/runTrace.types';
import type {
  AgentProfileSettingsMap,
  TopicWorkflowSettings,
} from '@/server/agents/configuration';
import type {
  PipelineError,
  PipelineInput,
  PipelineRunMode,
} from '@/server/flows/pipeline.types';

export function shouldRunCurate(mode: PipelineRunMode): boolean {
  return mode !== 'topic_setup' && mode !== 'skip';
}

export function shouldRunWebScout(mode: PipelineRunMode): boolean {
  return mode === 'full_report' || mode === 'incremental_update' || mode === 'scout_only';
}

export function shouldRunDistill(mode: PipelineRunMode, enableAutoDistill: boolean): boolean {
  if (mode === 'full_report' || mode === 'incremental_update' || mode === 'concept_only') {
    return true;
  }

  if (mode === 'lightweight_enrichment') {
    return enableAutoDistill;
  }

  return false;
}

export function shouldSynthesize(mode: PipelineRunMode): boolean {
  return mode === 'full_report' || mode === 'incremental_update';
}

export function resolveRequestedPipelineMode(
  input: PipelineInput,
  profiles: AgentProfileSettingsMap,
  topicWorkflowSettings?: TopicWorkflowSettings | null,
): PipelineRunMode {
  if (input.runMode) {
    return input.runMode;
  }

  if (input.trigger === 'auto_document') {
    return 'lightweight_enrichment';
  }

  if (input.trigger === 'auto_topic') {
    return 'topic_setup';
  }

  return topicWorkflowSettings?.defaultRunMode ?? profiles.pipeline.defaultRunMode;
}

export function finalizePipelineStatus(
  mode: PipelineRunMode,
  errors: PipelineError[],
  analyzed: AnalyzeFindingsOutput | null,
  reportId: string | null,
): RunStatus {
  if (errors.length > 0) {
    return 'partial';
  }

  if (mode === 'skip' || mode === 'topic_setup' || mode === 'concept_only' || mode === 'lightweight_enrichment') {
    return 'ok';
  }

  if ((mode === 'full_report' || mode === 'incremental_update') && !reportId) {
    return 'partial';
  }

  if ((mode === 'full_report' || mode === 'incremental_update' || mode === 'scout_only') && !analyzed) {
    return 'partial';
  }

  return 'ok';
}
