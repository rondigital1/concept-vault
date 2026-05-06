import { sql } from '@/db';
import { getTopTags } from '@/server/services/today.service';
import {
  getSavedTopicsByIds,
  getTopicDocuments,
  getTopicLinkedDocuments,
  type SavedTopicRow,
} from '@/server/repos/savedTopics.repo';
import { getDocumentsByIds, getRecentDocuments } from '@/server/repos/distiller.repo';
import {
  resolveTopicWorkflowSettings,
  type AgentProfileSettingsMap,
  type TopicWorkflowSettings,
} from '@/server/agents/configuration';
import type { PipelineInput } from '@/server/flows/pipeline.types';

export interface ResolvedPipelineTargets {
  day: string;
  documentIds: string[];
  focusTags: string[];
  goal: string;
  goalSource:
    | 'input'
    | 'topic'
    | 'document_tags'
    | 'vault_top_tags'
    | 'document_titles'
    | 'default';
  topic: SavedTopicRow | null;
  mode: 'explicit-query' | 'derive-from-vault';
  minQualityResults: number;
  minRelevanceScore: number;
  maxIterations: number;
  maxQueries: number;
  limit: number;
  workflowSettings: TopicWorkflowSettings;
}

export async function resolvePipelineWorkspaceId(input: PipelineInput): Promise<string> {
  if (typeof input.workspaceId === 'string' && input.workspaceId.trim()) {
    return input.workspaceId.trim();
  }

  const membershipRows = await sql<Array<{ workspace_id: string }>>`
    SELECT workspace_id
    FROM memberships
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `;

  if (membershipRows[0]?.workspace_id) {
    return membershipRows[0].workspace_id;
  }

  const workspaceRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM workspaces
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (workspaceRows[0]?.id) {
    return workspaceRows[0].id;
  }

  throw new Error('No workspace available for pipeline execution');
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.floor(value), max));
}

function clampScore(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(value, 1));
}

function normalizeTag(tag: string): string | null {
  const clean = tag.toLowerCase().trim().replace(/\s+/g, ' ');

  if (!clean) {
    return null;
  }

  if (clean.length < 2 || clean.length > 40) {
    return null;
  }

  return clean;
}

export function normalizePipelineTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const clean = normalizeTag(tag);

    if (!clean || seen.has(clean)) {
      continue;
    }

    seen.add(clean);
    normalized.push(clean);
  }

  return normalized;
}

export async function resolvePipelineTargets(
  input: PipelineInput,
  workspaceId: string,
  profiles: AgentProfileSettingsMap,
  providedTopic: SavedTopicRow | null = null,
): Promise<ResolvedPipelineTargets> {
  const day = typeof input.day === 'string' && input.day.trim() ? input.day.trim() : todayISODate();
  const explicitDocumentIds = Array.isArray(input.documentIds)
    ? input.documentIds.filter((id): id is string => typeof id === 'string').slice(0, 100)
    : [];

  let topic: SavedTopicRow | null = providedTopic;

  if (!topic && typeof input.topicId === 'string' && input.topicId.trim()) {
    const topics = await getSavedTopicsByIds({ workspaceId }, [input.topicId.trim()]);
    topic = topics[0] ?? null;

    if (!topic) {
      throw new Error(`Topic ${input.topicId.trim()} not found`);
    }
  }

  const workflowSettings = resolveTopicWorkflowSettings({
    maxDocsPerRun: topic?.max_docs_per_run ?? profiles.distiller.maxDocsPerRun,
    minQualityResults: topic?.min_quality_results ?? profiles.webScout.minQualityResults,
    minRelevanceScore: topic?.min_relevance_score ?? profiles.webScout.minRelevanceScore,
    maxIterations: topic?.max_iterations ?? profiles.webScout.maxIterations,
    maxQueries: topic?.max_queries ?? profiles.webScout.maxQueries,
    metadata: topic?.metadata ?? null,
    profiles,
  });
  const limit = clampInt(input.limit ?? workflowSettings.maxDocsPerRun, workflowSettings.maxDocsPerRun, 1, 20);

  let targetDocumentIds: string[] = [];
  let seedTags: string[] = topic?.focus_tags ?? [];
  let seedTitles: string[] = [];

  if (explicitDocumentIds.length > 0) {
    const docs = await getDocumentsByIds({ workspaceId }, explicitDocumentIds, limit);
    targetDocumentIds = docs.map((doc) => doc.id);
    seedTags = [...seedTags, ...docs.flatMap((doc) => doc.tags ?? [])];
    seedTitles = docs.map((doc) => doc.title);
  } else if (topic) {
    const linkedDocs = await getTopicLinkedDocuments({ workspaceId }, topic.id, limit);

    if (linkedDocs.length > 0) {
      targetDocumentIds = linkedDocs.map((doc) => doc.id);
      seedTags = [...seedTags, ...linkedDocs.flatMap((doc) => doc.tags ?? [])];
      seedTitles = linkedDocs.map((doc) => doc.title);
    } else {
      const docs = await getTopicDocuments({ workspaceId }, topic.focus_tags ?? [], limit);
      targetDocumentIds = docs.map((doc) => doc.id);
      seedTags = [...seedTags, ...docs.flatMap((doc) => doc.tags ?? [])];
      seedTitles = docs.map((doc) => doc.title);
    }
  } else {
    const docs = await getRecentDocuments({ workspaceId }, limit);
    targetDocumentIds = docs.map((doc) => doc.id);
    seedTags = [...seedTags, ...docs.flatMap((doc) => doc.tags ?? [])];
    seedTitles = docs.map((doc) => doc.title);
  }

  let goal = typeof input.goal === 'string' ? input.goal.trim().slice(0, 500) : '';
  let goalSource: ResolvedPipelineTargets['goalSource'] = 'default';

  if (goal) {
    goalSource = 'input';
  }

  if (!goal && topic?.goal) {
    goal = topic.goal.trim().slice(0, 500);
    goalSource = goal ? 'topic' : goalSource;
  }

  const focusTags = normalizePipelineTags(seedTags).slice(0, 20);

  if (!goal && focusTags.length > 0) {
    goal = `Find high-quality learning resources about: ${focusTags.slice(0, 5).join(', ')}`;
    goalSource = 'document_tags';
  }

  if (!goal) {
    const topTags = await getTopTags({ workspaceId }, 5);

    if (topTags.length > 0) {
      const derived = topTags.map((item) => item.tag);
      goal = `Find high-quality learning resources about: ${derived.join(', ')}`;
      seedTags = [...seedTags, ...derived];
      goalSource = 'vault_top_tags';
    }
  }

  if (!goal && seedTitles.length > 0) {
    const titleSubjects = seedTitles
      .map((title) => title.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (titleSubjects.length > 0) {
      goal = `Find high-quality learning resources related to these documents: ${titleSubjects.join('; ')}`;
      goalSource = 'document_titles';
    }
  }

  if (!goal) {
    goal = 'Find high-quality learning resources that complement my vault and support practical learning.';
    goalSource = 'default';
  }

  const minQualityResults = clampInt(
    input.minQualityResults ?? workflowSettings.minQualityResults,
    workflowSettings.minQualityResults,
    1,
    10,
  );
  const minRelevanceScore = clampScore(
    input.minRelevanceScore ?? workflowSettings.minRelevanceScore,
    workflowSettings.minRelevanceScore,
  );
  const maxIterations = clampInt(
    input.maxIterations ?? workflowSettings.maxIterations,
    workflowSettings.maxIterations,
    1,
    10,
  );
  const maxQueries = clampInt(
    input.maxQueries ?? workflowSettings.maxQueries,
    workflowSettings.maxQueries,
    1,
    25,
  );

  return {
    day,
    documentIds: targetDocumentIds,
    focusTags: normalizePipelineTags(seedTags).slice(0, 20),
    goal,
    goalSource,
    topic,
    mode: input.goal ? 'explicit-query' : 'derive-from-vault',
    minQualityResults,
    minRelevanceScore,
    maxIterations,
    maxQueries,
    limit,
    workflowSettings,
  };
}
