import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import { getSavedTopicsByIds, type SavedTopicRow } from '@/server/repos/savedTopics.repo';
import { resolveTopicWorkflowSettings, type AgentProfileSettingsMap } from '@/server/agents/configuration';
import { resolveRequestedPipelineMode } from '@/server/flows/pipeline.policy';
import type { PipelineInput, PipelineRunMode } from '@/server/flows/pipeline.types';

export interface PipelineModeContext {
  profiles: AgentProfileSettingsMap;
  preselectedTopic: SavedTopicRow | null;
  mode: PipelineRunMode;
  idempotencyKey: string | null;
}

export async function resolvePipelineModeContext(
  input: PipelineInput,
  workspaceId: string,
): Promise<PipelineModeContext> {
  const profiles = await getAgentProfileSettingsMap();
  const preselectedTopic =
    typeof input.topicId === 'string' && input.topicId.trim()
      ? (await getSavedTopicsByIds({ workspaceId }, [input.topicId.trim()]))[0] ?? null
      : null;
  const preselectedTopicWorkflowSettings = preselectedTopic
    ? resolveTopicWorkflowSettings({
        maxDocsPerRun: preselectedTopic.max_docs_per_run,
        minQualityResults: preselectedTopic.min_quality_results,
        minRelevanceScore: preselectedTopic.min_relevance_score,
        maxIterations: preselectedTopic.max_iterations,
        maxQueries: preselectedTopic.max_queries,
        metadata: preselectedTopic.metadata,
        profiles,
      })
    : null;
  const mode = resolveRequestedPipelineMode(input, profiles, preselectedTopicWorkflowSettings);
  const idempotencyKey =
    typeof input.idempotencyKey === 'string' && input.idempotencyKey.trim()
      ? input.idempotencyKey.trim()
      : null;

  return {
    profiles,
    preselectedTopic,
    mode,
    idempotencyKey,
  };
}
