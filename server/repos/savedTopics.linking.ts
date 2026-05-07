import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { logger } from '@/server/observability/logger';
import { setTopicSignal } from '@/server/repos/savedTopics.mutations';
import { normalizeSavedTopicTags } from '@/server/repos/savedTopics.sql';

export async function linkTopicToMatchingDocuments(
  scope: WorkspaceScope,
  topicId: string,
  focusTags: string[],
  limit = 200,
): Promise<{ linkedCount: number; documentIds: string[] }> {
  const startedAt = Date.now();
  const normalizedFocus = normalizeSavedTopicTags(focusTags);
  if (normalizedFocus.length === 0) {
    logger.info('db.saved_topics.link_topic_documents.completed', {
      durationMs: Date.now() - startedAt,
      topicId,
      focusTagCount: 0,
      linkedCount: 0,
      limit,
      emptyFocusTags: true,
    });
    return { linkedCount: 0, documentIds: [] };
  }

  try {
    const rows = await sql<Array<{ document_id: string }>>`
      WITH candidate_documents AS (
        SELECT
          d.id,
          d.tags,
          ROW_NUMBER() OVER (ORDER BY d.imported_at DESC, d.id DESC) AS ord
        FROM documents d
        WHERE d.workspace_id = ${scope.workspaceId}
          AND d.tags && ${sql.array(normalizedFocus)}
        ORDER BY d.imported_at DESC, d.id DESC
        LIMIT ${limit}
      ),
      upserted_links AS (
        INSERT INTO topic_documents (topic_id, document_id, matched_tags, linked_at, updated_at)
        SELECT
          st.id,
          d.id,
          ARRAY(
            SELECT tag
            FROM unnest(d.tags) WITH ORDINALITY AS matched(tag, ord)
            WHERE tag = ANY(${sql.array(normalizedFocus)})
            ORDER BY ord
          ),
          now(),
          now()
        FROM saved_topics st
        INNER JOIN candidate_documents d ON true
        WHERE st.workspace_id = ${scope.workspaceId}
          AND st.id = ${topicId}
        ON CONFLICT (topic_id, document_id)
        DO UPDATE
          SET matched_tags = EXCLUDED.matched_tags,
              updated_at = now()
        RETURNING document_id
      )
      SELECT u.document_id
      FROM upserted_links u
      INNER JOIN candidate_documents d ON d.id = u.document_id
      ORDER BY d.ord
    `;

    if (rows.length > 0) {
      await setTopicSignal(scope, topicId);
    }

    logger.info('db.saved_topics.link_topic_documents.completed', {
      durationMs: Date.now() - startedAt,
      topicId,
      focusTagCount: normalizedFocus.length,
      linkedCount: rows.length,
      limit,
    });

    return {
      linkedCount: rows.length,
      documentIds: rows.map((row) => row.document_id),
    };
  } catch (error) {
    logger.error('db.saved_topics.link_topic_documents.failed', {
      durationMs: Date.now() - startedAt,
      topicId,
      focusTagCount: normalizedFocus.length,
      limit,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function linkDocumentToMatchingTopics(
  scope: WorkspaceScope,
  documentId: string,
  documentTags: string[],
): Promise<{ topicIds: string[] }> {
  const startedAt = Date.now();
  const normalized = normalizeSavedTopicTags(documentTags);
  if (normalized.length === 0) {
    logger.info('db.saved_topics.link_document_topics.completed', {
      durationMs: Date.now() - startedAt,
      documentId,
      documentTagCount: 0,
      linkedCount: 0,
      emptyDocumentTags: true,
    });
    return { topicIds: [] };
  }

  try {
    const rows = await sql<Array<{ topic_id: string }>>`
      WITH candidate_topics AS (
        SELECT st.id, st.focus_tags
        FROM saved_topics st
        WHERE st.workspace_id = ${scope.workspaceId}
          AND st.is_active = true
          AND cardinality(st.focus_tags) > 0
          AND st.focus_tags && ${sql.array(normalized)}
      ),
      upserted_links AS (
        INSERT INTO topic_documents (topic_id, document_id, matched_tags, linked_at, updated_at)
        SELECT
          st.id,
          d.id,
          ARRAY(
            SELECT tag
            FROM unnest(${sql.array(normalized)}) WITH ORDINALITY AS matched(tag, ord)
            WHERE tag = ANY(st.focus_tags)
            ORDER BY ord
          ),
          now(),
          now()
        FROM candidate_topics st
        INNER JOIN documents d ON d.id = ${documentId}
        WHERE d.workspace_id = ${scope.workspaceId}
        ON CONFLICT (topic_id, document_id)
        DO UPDATE
          SET matched_tags = EXCLUDED.matched_tags,
              updated_at = now()
        RETURNING topic_id
      ),
      signaled_topics AS (
        UPDATE saved_topics st
        SET last_signal_at = now(), updated_at = now()
        WHERE st.workspace_id = ${scope.workspaceId}
          AND st.id IN (SELECT topic_id FROM upserted_links)
        RETURNING st.id
      )
      SELECT id AS topic_id
      FROM signaled_topics
    `;

    logger.info('db.saved_topics.link_document_topics.completed', {
      durationMs: Date.now() - startedAt,
      documentId,
      documentTagCount: normalized.length,
      linkedCount: rows.length,
    });

    return { topicIds: rows.map((row) => row.topic_id) };
  } catch (error) {
    logger.error('db.saved_topics.link_document_topics.failed', {
      durationMs: Date.now() - startedAt,
      documentId,
      documentTagCount: normalized.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
