import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import type {
  AgentsView,
  RecentRunSummary,
  RunComposerState,
} from '@/lib/agentsWorkspaceTypes';
import type { TopicWorkflowDraft } from './agentsInspectorTypes';

type AgentProfileResponse<K extends keyof AgentProfileSettingsMap> = {
  profile: {
    settings: AgentProfileSettingsMap[K];
  };
};

type StartPipelineRunOptions = {
  selectedTopicId: string | null;
  composer: RunComposerState;
};

type BuildRunningPipelineRunSummaryOptions = {
  runId: string;
  selectedTopicId: string | null;
  selectedTopicName: string | null;
  runMode: RunComposerState['runMode'];
};

async function saveAgentProfile<K extends keyof AgentProfileSettingsMap>(
  agentKey: K,
  payload: AgentProfileSettingsMap[K],
): Promise<AgentProfileSettingsMap[K]> {
  const response = await fetch(`/api/agents/profiles/${agentKey}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to save ${agentKey}`);
  }

  const body = await response.json() as AgentProfileResponse<K>;
  return body.profile.settings;
}

export async function saveGlobalAgentProfiles(
  globalDraft: AgentProfileSettingsMap,
): Promise<AgentProfileSettingsMap> {
  const [pipeline, curator, webScout, distiller] = await Promise.all([
    saveAgentProfile('pipeline', globalDraft.pipeline),
    saveAgentProfile('curator', globalDraft.curator),
    saveAgentProfile('webScout', globalDraft.webScout),
    saveAgentProfile('distiller', globalDraft.distiller),
  ]);

  return {
    pipeline,
    curator,
    webScout,
    distiller,
  };
}

export async function saveTopicWorkflowDraft(
  topicId: string,
  topicDraft: TopicWorkflowDraft,
): Promise<AgentsView['topicOptions'][number]> {
  const response = await fetch(`/api/topics/${topicId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(topicDraft),
  });

  if (!response.ok) {
    throw new Error('Failed to save topic');
  }

  const body = await response.json() as { topicOption: AgentsView['topicOptions'][number] };
  return body.topicOption;
}

export async function startPipelineRun({
  selectedTopicId,
  composer,
}: StartPipelineRunOptions): Promise<string> {
  const response = await fetch('/api/runs/pipeline', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      topicId: selectedTopicId ?? undefined,
      runMode: composer.runMode,
      goal: composer.goal.trim() || undefined,
      enableCategorization: composer.enableCategorization,
      skipPublish: composer.skipPublish,
      minQualityResults: composer.minQualityResults,
      minRelevanceScore: composer.minRelevanceScore,
      maxIterations: composer.maxIterations,
      maxQueries: composer.maxQueries,
      limit: composer.maxDocsPerRun,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start run');
  }

  const body = await response.json() as { runId: string };
  return body.runId;
}

export function buildRunningPipelineRunSummary({
  runId,
  selectedTopicId,
  selectedTopicName,
  runMode,
}: BuildRunningPipelineRunSummaryOptions): RecentRunSummary {
  return {
    id: runId,
    kind: 'pipeline',
    status: 'running',
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMs: null,
    topicId: selectedTopicId,
    topicName: selectedTopicName,
    runMode,
    stageProgress: [],
    lastError: null,
  };
}
