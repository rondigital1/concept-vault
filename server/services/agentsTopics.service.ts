import type { AgentProfileSettingsMap } from '@/server/agents/configuration';
import { resolveTopicWorkflowSettings } from '@/server/agents/configuration';
import type { listSavedTopics } from '@/server/repos/savedTopics.repo';
import type { AgentTopicOption } from '@/lib/agentsWorkspaceTypes';

export function buildTopicOptions(
  topics: Awaited<ReturnType<typeof listSavedTopics>>,
  profiles: AgentProfileSettingsMap,
  linkedCounts: Map<string, number>,
): AgentTopicOption[] {
  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    goal: topic.goal,
    focusTags: topic.focus_tags ?? [],
    linkedDocumentCount: linkedCounts.get(topic.id) ?? 0,
    lastRunAt: topic.last_run_at,
    lastRunMode: topic.last_run_mode,
    isTracked: topic.is_tracked,
    isActive: topic.is_active,
    cadence: topic.cadence,
    workflowSettings: resolveTopicWorkflowSettings({
      maxDocsPerRun: topic.max_docs_per_run,
      minQualityResults: topic.min_quality_results,
      minRelevanceScore: topic.min_relevance_score,
      maxIterations: topic.max_iterations,
      maxQueries: topic.max_queries,
      metadata: topic.metadata,
      profiles,
    }),
  }));
}
