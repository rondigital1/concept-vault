import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { logger } from '@/server/observability/logger';

export interface DocumentListItem {
  id: string;
  title: string;
  source: string;
  tags: string[];
  is_favorite: boolean;
  imported_at: string;
}

const DEFAULT_SEARCH_LIMIT = 50;

function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function normalizeSearchLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }

  return Math.max(1, Math.min(Math.floor(limit), DEFAULT_SEARCH_LIMIT));
}

/** All documents for sidebar listing (excludes content for performance) */
export async function listDocuments(scope: WorkspaceScope): Promise<DocumentListItem[]> {
  return sql<DocumentListItem[]>`
    SELECT id, title, source, tags, is_favorite, imported_at
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
  `;
}

/** Search documents by indexed full-text content and prioritized title matches. */
export async function searchDocuments(
  scope: WorkspaceScope,
  query: string,
  limit = DEFAULT_SEARCH_LIMIT,
): Promise<DocumentListItem[]> {
  const startedAt = Date.now();
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedLimit = normalizeSearchLimit(limit);

  if (!normalizedQuery || !/[a-z0-9]/i.test(normalizedQuery)) {
    logger.info('db.documents.search.completed', {
      durationMs: Date.now() - startedAt,
      queryLength: normalizedQuery.length,
      resultCount: 0,
      limit: normalizedLimit,
      emptyQuery: true,
    });
    return [];
  }

  try {
    const rows = await sql<DocumentListItem[]>`
      WITH search_input AS (
        SELECT websearch_to_tsquery('simple', ${normalizedQuery}) AS ts_query
      ),
      title_hits AS (
        SELECT
          d.id,
          d.title,
          d.source,
          d.tags,
          d.is_favorite,
          d.imported_at,
          0 AS match_priority,
          0::real AS search_rank
        FROM documents d
        WHERE d.workspace_id = ${scope.workspaceId}
          AND POSITION(LOWER(${normalizedQuery}) IN LOWER(d.title)) > 0
      ),
      content_hits AS (
        SELECT
          d.id,
          d.title,
          d.source,
          d.tags,
          d.is_favorite,
          d.imported_at,
          1 AS match_priority,
          ts_rank_cd(
            to_tsvector('simple', COALESCE(d.title, '') || ' ' || COALESCE(d.content, '')),
            s.ts_query
          ) AS search_rank
        FROM documents d
        CROSS JOIN search_input s
        WHERE d.workspace_id = ${scope.workspaceId}
          AND to_tsvector('simple', COALESCE(d.title, '') || ' ' || COALESCE(d.content, '')) @@ s.ts_query
      ),
      deduped_hits AS (
        SELECT DISTINCT ON (combined.id)
          combined.id,
          combined.title,
          combined.source,
          combined.tags,
          combined.is_favorite,
          combined.imported_at,
          combined.match_priority,
          combined.search_rank
        FROM (
          SELECT * FROM title_hits
          UNION ALL
          SELECT * FROM content_hits
        ) AS combined
        ORDER BY
          combined.id,
          combined.match_priority ASC,
          combined.search_rank DESC,
          combined.imported_at DESC
      )
      SELECT
        id,
        title,
        source,
        tags,
        is_favorite,
        imported_at
      FROM deduped_hits
      ORDER BY
        match_priority ASC,
        search_rank DESC,
        imported_at DESC
      LIMIT ${normalizedLimit}
    `;

    logger.info('db.documents.search.completed', {
      durationMs: Date.now() - startedAt,
      queryLength: normalizedQuery.length,
      resultCount: rows.length,
      limit: normalizedLimit,
    });

    return rows;
  } catch (error) {
    logger.error('db.documents.search.failed', {
      durationMs: Date.now() - startedAt,
      queryLength: normalizedQuery.length,
      limit: normalizedLimit,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Toggle the is_favorite flag, return new value */
export async function toggleFavorite(
  scope: WorkspaceScope,
  documentId: string,
): Promise<boolean> {
  const rows = await sql<Array<{ is_favorite: boolean }>>`
    UPDATE documents
    SET is_favorite = NOT is_favorite
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${documentId}
    RETURNING is_favorite
  `;
  return rows[0]?.is_favorite ?? false;
}
