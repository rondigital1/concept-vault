import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import {
  normalizeSavedTopicTags,
  savedTopicRowSelection,
  type SavedTopicJsonParam,
} from '@/server/repos/savedTopics.sql';
import type {
  CreateSavedTopicInput,
  SavedTopicRow,
  UpdateSavedTopicInput,
  UpsertTopicSetupInput,
} from '@/server/repos/savedTopics.types';

export async function createSavedTopic(input: CreateSavedTopicInput): Promise<SavedTopicRow> {
  const focusTags = normalizeSavedTopicTags(input.focusTags ?? []);
  const cadence = input.cadence ?? 'weekly';

  const rows = await sql<SavedTopicRow[]>`
    INSERT INTO saved_topics (
      workspace_id,
      name,
      goal,
      focus_tags,
      max_docs_per_run,
      min_quality_results,
      min_relevance_score,
      max_iterations,
      max_queries,
      is_active,
      is_tracked,
      cadence,
      metadata
    )
    VALUES (
      ${input.workspaceId},
      ${input.name},
      ${input.goal},
      ${sql.array(focusTags)},
      ${input.maxDocsPerRun ?? 5},
      ${input.minQualityResults ?? 3},
      ${input.minRelevanceScore ?? 0.8},
      ${input.maxIterations ?? 5},
      ${input.maxQueries ?? 10},
      ${input.isActive ?? true},
      ${input.isTracked ?? false},
      ${cadence},
      ${sql.json((input.metadata ?? {}) as SavedTopicJsonParam)}
    )
    RETURNING ${savedTopicRowSelection()}
  `;

  return rows[0];
}

export async function updateSavedTopic(
  scope: WorkspaceScope,
  topicId: string,
  input: UpdateSavedTopicInput,
): Promise<SavedTopicRow | null> {
  const normalizedFocusTags = input.focusTags ? normalizeSavedTopicTags(input.focusTags) : null;
  const nextMetadata = input.metadata ?? null;

  const rows = await sql<SavedTopicRow[]>`
    UPDATE saved_topics
    SET
      name = COALESCE(${input.name ?? null}, name),
      goal = COALESCE(${input.goal ?? null}, goal),
      focus_tags = COALESCE(${normalizedFocusTags ? sql.array(normalizedFocusTags) : null}, focus_tags),
      max_docs_per_run = COALESCE(${input.maxDocsPerRun ?? null}, max_docs_per_run),
      min_quality_results = COALESCE(${input.minQualityResults ?? null}, min_quality_results),
      min_relevance_score = COALESCE(${input.minRelevanceScore ?? null}, min_relevance_score),
      max_iterations = COALESCE(${input.maxIterations ?? null}, max_iterations),
      max_queries = COALESCE(${input.maxQueries ?? null}, max_queries),
      is_active = COALESCE(${input.isActive ?? null}, is_active),
      is_tracked = COALESCE(${input.isTracked ?? null}, is_tracked),
      cadence = COALESCE(${input.cadence ?? null}, cadence),
      metadata = COALESCE(${nextMetadata ? sql.json(nextMetadata as SavedTopicJsonParam) : null}, metadata),
      updated_at = now()
    WHERE id = ${topicId}
      AND workspace_id = ${scope.workspaceId}
    RETURNING ${savedTopicRowSelection()}
  `;

  return rows[0] ?? null;
}

export async function upsertTopicSetup(
  scope: WorkspaceScope,
  input: UpsertTopicSetupInput,
): Promise<SavedTopicRow | null> {
  const focusTags = normalizeSavedTopicTags(input.focusTags);

  const rows = await sql<SavedTopicRow[]>`
    UPDATE saved_topics
    SET
      focus_tags = ${sql.array(focusTags)},
      metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json((input.metadata ?? {}) as SavedTopicJsonParam)},
      updated_at = now()
    WHERE id = ${input.topicId}
      AND workspace_id = ${scope.workspaceId}
    RETURNING ${savedTopicRowSelection()}
  `;

  return rows[0] ?? null;
}

export async function setTopicSignal(scope: WorkspaceScope, topicId: string): Promise<void> {
  await sql`
    UPDATE saved_topics
    SET last_signal_at = now(), updated_at = now()
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${topicId}
  `;
}

export async function markTopicsUpdatedByTags(
  scope: WorkspaceScope,
  tags: string[],
): Promise<number> {
  const normalized = normalizeSavedTopicTags(tags);
  if (normalized.length === 0) {
    return 0;
  }

  const rows = await sql<Array<{ id: string }>>`
    UPDATE saved_topics
    SET last_signal_at = now(), updated_at = now()
    WHERE workspace_id = ${scope.workspaceId}
      AND is_active = true
      AND cardinality(focus_tags) > 0
      AND focus_tags && ${sql.array(normalized)}
    RETURNING id
  `;

  return rows.length;
}

export async function markTopicRunCompleted(
  scope: WorkspaceScope,
  topicId: string,
  mode: string,
): Promise<void> {
  await sql`
    UPDATE saved_topics
    SET
      last_run_at = now(),
      last_run_mode = ${mode},
      updated_at = now()
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${topicId}
  `;
}
