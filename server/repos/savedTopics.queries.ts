import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { savedTopicRowSelection } from '@/server/repos/savedTopics.sql';
import type { SavedTopicRow } from '@/server/repos/savedTopics.types';

export async function listSavedTopics(
  scope: WorkspaceScope,
  options?: {
    activeOnly?: boolean;
    trackedOnly?: boolean;
  },
): Promise<SavedTopicRow[]> {
  const activeOnly = options?.activeOnly === true;
  const trackedOnly = options?.trackedOnly === true;

  if (activeOnly && trackedOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${savedTopicRowSelection()}
      FROM saved_topics
      WHERE workspace_id = ${scope.workspaceId}
        AND is_active = true
        AND is_tracked = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  if (activeOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${savedTopicRowSelection()}
      FROM saved_topics
      WHERE workspace_id = ${scope.workspaceId}
        AND is_active = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  if (trackedOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${savedTopicRowSelection()}
      FROM saved_topics
      WHERE workspace_id = ${scope.workspaceId}
        AND is_tracked = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  return sql<SavedTopicRow[]>`
    SELECT ${savedTopicRowSelection()}
    FROM saved_topics
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function getSavedTopicsByIds(
  scope: WorkspaceScope,
  topicIds: string[],
): Promise<SavedTopicRow[]> {
  if (topicIds.length === 0) {
    return [];
  }

  return sql<SavedTopicRow[]>`
    SELECT ${savedTopicRowSelection()}
    FROM saved_topics
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ANY(${topicIds})
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function listDueTrackedTopics(
  scope: WorkspaceScope,
  referenceTime = new Date(),
): Promise<SavedTopicRow[]> {
  const iso = referenceTime.toISOString();

  return sql<SavedTopicRow[]>`
    SELECT ${savedTopicRowSelection()}
    FROM saved_topics
    WHERE workspace_id = ${scope.workspaceId}
      AND is_active = true
      AND is_tracked = true
      AND (
        (cadence = 'daily' AND (last_run_at IS NULL OR last_run_at < (${iso}::timestamptz - interval '24 hours')))
        OR
        (cadence = 'weekly' AND (last_run_at IS NULL OR last_run_at < (${iso}::timestamptz - interval '7 days')))
      )
    ORDER BY COALESCE(last_run_at, to_timestamp(0)) ASC, updated_at DESC
  `;
}
