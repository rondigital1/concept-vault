import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import { listSavedTopics } from '@/server/repos/savedTopics.repo';
import type { AgentsView } from '@/lib/agentsWorkspaceTypes';
import {
  buildPipelineRegistryEntry,
  buildStageRegistryEntry,
} from '@/server/services/agentsRegistry.service';
import {
  countRecentResearchReports,
  groupStepsByRun,
  listPipelineRuns,
  listRecentRuns,
  listStageRows,
  listStepsForRuns,
  listTopicLinkedCounts,
} from '@/server/services/agentsReadModel.repo';
import {
  buildExecutionEvents,
  buildRunSummary,
  buildSelectedRun,
} from '@/server/services/agentsRuns.service';
import { buildTopicOptions } from '@/server/services/agentsTopics.service';

export async function getAgentsView(
  scope: WorkspaceScope,
  options?: {
    selectedTopicId?: string | null;
    selectedRunId?: string | null;
  },
): Promise<AgentsView> {
  const [
    profiles,
    topics,
    linkedCounts,
    recentRunRows,
    pipelineHistoryRows,
    curateRows,
    webScoutRows,
    distillRows,
    reportCount30d,
  ] = await Promise.all([
    getAgentProfileSettingsMap(),
    listSavedTopics(scope),
    listTopicLinkedCounts(scope),
    listRecentRuns(scope, 12),
    listPipelineRuns(scope, 60),
    listStageRows(scope, 'pipeline_curate'),
    listStageRows(scope, 'pipeline_webscout'),
    listStageRows(scope, 'pipeline_distill'),
    countRecentResearchReports(scope),
  ]);

  const topicOptions = buildTopicOptions(topics, profiles, linkedCounts);
  const topicById = new Map(topicOptions.map((topic) => [topic.id, topic]));
  const recentRunIds = recentRunRows.map((run) => run.id);
  const recentStepRows = await listStepsForRuns(scope, recentRunIds);
  const stepsByRun = groupStepsByRun(recentStepRows);
  const recentRuns = recentRunRows.map((run) =>
    buildRunSummary(run, stepsByRun.get(run.id) ?? [], topicById),
  );
  const selectedTopic =
    (options?.selectedTopicId ? topicById.get(options.selectedTopicId) ?? null : null) ??
    topicOptions[0] ??
    null;
  const selectedRunId =
    options?.selectedRunId ??
    recentRuns.find((run) => run.status === 'running')?.id ??
    recentRuns[0]?.id ??
    null;
  const selectedRun = selectedRunId ? await buildSelectedRun(scope, selectedRunId, recentRuns) : null;

  return {
    globalProfiles: profiles,
    topicOptions,
    selectedTopic,
    agentRegistry: [
      buildPipelineRegistryEntry(pipelineHistoryRows, reportCount30d),
      buildStageRegistryEntry('curator', curateRows),
      buildStageRegistryEntry('webScout', webScoutRows),
      buildStageRegistryEntry('distiller', distillRows),
    ],
    recentRuns,
    selectedRun,
    executionEvents: buildExecutionEvents(recentRuns),
  };
}
