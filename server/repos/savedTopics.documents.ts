import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { normalizeSavedTopicTags } from '@/server/repos/savedTopics.sql';
import type { LinkedTopicDocumentRow, TopicDocumentRow } from '@/server/repos/savedTopics.types';

export async function getTopicDocuments(
  scope: WorkspaceScope,
  focusTags: string[],
  limit: number,
): Promise<TopicDocumentRow[]> {
  const normalized = normalizeSavedTopicTags(focusTags);

  if (normalized.length > 0) {
    return sql<TopicDocumentRow[]>`
      SELECT id, title, tags
      FROM documents
      WHERE workspace_id = ${scope.workspaceId}
        AND tags && ${sql.array(normalized)}
      ORDER BY imported_at DESC
      LIMIT ${limit}
    `;
  }

  return sql<TopicDocumentRow[]>`
    SELECT id, title, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
}

export async function getTopicLinkedDocuments(
  scope: WorkspaceScope,
  topicId: string,
  limit: number,
): Promise<TopicDocumentRow[]> {
  return sql<TopicDocumentRow[]>`
    SELECT d.id, d.title, d.tags
    FROM topic_documents td
    JOIN documents d ON d.id = td.document_id
    JOIN saved_topics st ON st.id = td.topic_id
    WHERE st.workspace_id = ${scope.workspaceId}
      AND td.topic_id = ${topicId}
    ORDER BY td.updated_at DESC
    LIMIT ${limit}
  `;
}

export async function countTopicLinkedDocuments(
  scope: WorkspaceScope,
  topicId: string,
): Promise<number> {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::integer AS count
    FROM topic_documents td
    INNER JOIN saved_topics st ON st.id = td.topic_id
    WHERE st.workspace_id = ${scope.workspaceId}
      AND td.topic_id = ${topicId}
  `;

  return rows[0]?.count ?? 0;
}

export async function countTopicSignalsSince(
  scope: WorkspaceScope,
  topicId: string,
  since: string | null,
): Promise<number> {
  if (!since) {
    const rows = await sql<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count
      FROM topic_documents td
      INNER JOIN saved_topics st ON st.id = td.topic_id
      WHERE st.workspace_id = ${scope.workspaceId}
        AND td.topic_id = ${topicId}
    `;
    return rows[0]?.count ?? 0;
  }

  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::integer AS count
    FROM topic_documents td
    INNER JOIN saved_topics st ON st.id = td.topic_id
    WHERE st.workspace_id = ${scope.workspaceId}
      AND td.topic_id = ${topicId}
      AND updated_at > ${since}
  `;

  return rows[0]?.count ?? 0;
}

export async function listTopicDocumentLinks(
  scope: WorkspaceScope,
  topicId: string,
  limit: number,
): Promise<LinkedTopicDocumentRow[]> {
  return sql<LinkedTopicDocumentRow[]>`
    SELECT td.topic_id, td.document_id, td.matched_tags, td.linked_at, td.updated_at
    FROM topic_documents td
    INNER JOIN saved_topics st ON st.id = td.topic_id
    WHERE st.workspace_id = ${scope.workspaceId}
      AND td.topic_id = ${topicId}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
}
