import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { logger } from '@/server/observability/logger';

export type TopicCadence = 'daily' | 'weekly';
type JsonParam = Parameters<typeof sql.json>[0];

export interface SavedTopicRow {
  id: string;
  name: string;
  goal: string;
  focus_tags: string[];
  max_docs_per_run: number;
  min_quality_results: number;
  min_relevance_score: number;
  max_iterations: number;
  max_queries: number;
  is_active: boolean;
  is_tracked: boolean;
  cadence: TopicCadence;
  last_run_at: string | null;
  last_run_mode: string | null;
  last_signal_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TopicDocumentRow {
  id: string;
  title: string;
  tags: string[];
}

export interface LinkedTopicDocumentRow {
  topic_id: string;
  document_id: string;
  matched_tags: string[];
  linked_at: string;
  updated_at: string;
}

export interface CreateSavedTopicInput {
  workspaceId: string;
  name: string;
  goal: string;
  focusTags?: string[];
  maxDocsPerRun?: number;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  isActive?: boolean;
  isTracked?: boolean;
  cadence?: TopicCadence;
  metadata?: Record<string, unknown>;
}

export interface UpdateSavedTopicInput {
  name?: string;
  goal?: string;
  focusTags?: string[];
  maxDocsPerRun?: number;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  isActive?: boolean;
  isTracked?: boolean;
  cadence?: TopicCadence;
  metadata?: Record<string, unknown>;
}

export interface UpsertTopicSetupInput {
  topicId: string;
  focusTags: string[];
  metadata?: Record<string, unknown>;
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const clean = tag.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!clean || clean.length < 2 || clean.length > 40 || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    normalized.push(clean);
  }

  return normalized.slice(0, 20);
}

function rowSelection() {
  return sql`
    id,
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
    last_run_at,
    last_run_mode,
    last_signal_at,
    metadata,
    created_at,
    updated_at
  `;
}

export async function listSavedTopics(
  scope: WorkspaceScope,
  options?: {
  activeOnly?: boolean;
  trackedOnly?: boolean;
}): Promise<SavedTopicRow[]> {
  const activeOnly = options?.activeOnly === true;
  const trackedOnly = options?.trackedOnly === true;

  if (activeOnly && trackedOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${rowSelection()}
      FROM saved_topics
      WHERE workspace_id = ${scope.workspaceId}
        AND is_active = true
        AND is_tracked = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  if (activeOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${rowSelection()}
      FROM saved_topics
      WHERE workspace_id = ${scope.workspaceId}
        AND is_active = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  if (trackedOnly) {
    return sql<SavedTopicRow[]>`
      SELECT ${rowSelection()}
      FROM saved_topics
      WHERE workspace_id = ${scope.workspaceId}
        AND is_tracked = true
      ORDER BY updated_at DESC, created_at DESC
    `;
  }

  return sql<SavedTopicRow[]>`
    SELECT ${rowSelection()}
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
    SELECT ${rowSelection()}
    FROM saved_topics
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ANY(${topicIds})
    ORDER BY updated_at DESC, created_at DESC
  `;
}

export async function createSavedTopic(input: CreateSavedTopicInput): Promise<SavedTopicRow> {
  const focusTags = normalizeTags(input.focusTags ?? []);
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
      ${sql.json((input.metadata ?? {}) as JsonParam)}
    )
    RETURNING ${rowSelection()}
  `;

  return rows[0];
}

export async function updateSavedTopic(
  scope: WorkspaceScope,
  topicId: string,
  input: UpdateSavedTopicInput,
): Promise<SavedTopicRow | null> {
  const normalizedFocusTags = input.focusTags ? normalizeTags(input.focusTags) : null;
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
      metadata = COALESCE(${nextMetadata ? sql.json(nextMetadata as JsonParam) : null}, metadata),
      updated_at = now()
    WHERE id = ${topicId}
      AND workspace_id = ${scope.workspaceId}
    RETURNING ${rowSelection()}
  `;

  return rows[0] ?? null;
}

export async function upsertTopicSetup(
  scope: WorkspaceScope,
  input: UpsertTopicSetupInput,
): Promise<SavedTopicRow | null> {
  const focusTags = normalizeTags(input.focusTags);

  const rows = await sql<SavedTopicRow[]>`
    UPDATE saved_topics
    SET
      focus_tags = ${sql.array(focusTags)},
      metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json((input.metadata ?? {}) as JsonParam)},
      updated_at = now()
    WHERE id = ${input.topicId}
      AND workspace_id = ${scope.workspaceId}
    RETURNING ${rowSelection()}
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
  const normalized = normalizeTags(tags);
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

export async function listDueTrackedTopics(
  scope: WorkspaceScope,
  referenceTime = new Date(),
): Promise<SavedTopicRow[]> {
  const iso = referenceTime.toISOString();

  return sql<SavedTopicRow[]>`
    SELECT ${rowSelection()}
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

export async function getTopicDocuments(
  scope: WorkspaceScope,
  focusTags: string[],
  limit: number,
): Promise<TopicDocumentRow[]> {
  const normalized = normalizeTags(focusTags);

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

export async function linkTopicToMatchingDocuments(
  scope: WorkspaceScope,
  topicId: string,
  focusTags: string[],
  limit = 200,
): Promise<{ linkedCount: number; documentIds: string[] }> {
  const startedAt = Date.now();
  const normalizedFocus = normalizeTags(focusTags);
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
  const normalized = normalizeTags(documentTags);
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
