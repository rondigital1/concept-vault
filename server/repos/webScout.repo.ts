/**
 * WebScout Repository
 *
 * Database operations for the webScout agent.
 * Handles document queries for deriving searches and artifact creation.
 */

import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

// Type accepted by sql.json(); used to assert Record<string, unknown> for JSONB.
type JsonParam = Parameters<typeof sql.json>[0];

// ---------- Types ----------

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface ArtifactInput {
  workspaceId: string;
  runId: string | null;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  sourceRefs: Record<string, unknown>;
}

// ---------- Document Queries ----------

/**
 * Fetch recent documents for deriving search queries
 */
export async function getRecentDocumentsForQuery(
  scope: WorkspaceScope,
  limit: number,
): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Fetch documents filtered by tags
 */
export async function getDocumentsByTags(
  scope: WorkspaceScope,
  tags: string[],
  limit: number
): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND tags && ${tags}
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

// ---------- Deduplication ----------

/**
 * Check if a URL already exists in documents (for deduplication)
 */
export async function checkUrlExists(scope: WorkspaceScope, url: string): Promise<boolean> {
  const rows = await sql<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1 FROM documents WHERE workspace_id = ${scope.workspaceId} AND source = ${url}
    ) as exists
  `;
  return rows[0]?.exists ?? false;
}

/**
 * Check multiple URLs for existence (batch dedup)
 */
export async function filterExistingUrls(
  scope: WorkspaceScope,
  urls: string[],
): Promise<string[]> {
  if (urls.length === 0) return [];

  const rows = await sql<Array<{ source: string }>>`
    SELECT source
    FROM documents
    WHERE workspace_id = ${scope.workspaceId}
      AND source = ANY(${urls})
  `;

  const existingUrls = new Set(rows.map((r) => r.source));
  return urls.filter((url) => !existingUrls.has(url));
}

/**
 * Filter out URLs that were previously proposed or rejected as web-proposal artifacts.
 * Returns only URLs that have NOT been previously proposed/rejected.
 */
export async function filterPreviouslyProposedUrls(
  scope: WorkspaceScope,
  urls: string[],
): Promise<{
  newUrls: string[];
  previouslyProposed: string[];
}> {
  if (urls.length === 0) return { newUrls: [], previouslyProposed: [] };

  const rows = await sql<Array<{ url: string }>>`
    SELECT DISTINCT content->>'url' AS url
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND kind = 'web-proposal'
      AND content->>'url' = ANY(${urls})
      AND status IN ('proposed', 'rejected')
  `;

  const proposedSet = new Set(rows.map((r) => r.url));
  return {
    newUrls: urls.filter((url) => !proposedSet.has(url)),
    previouslyProposed: urls.filter((url) => proposedSet.has(url)),
  };
}

// ---------- Artifact Operations ----------

/**
 * Save a web proposal artifact to the database
 */
export async function insertWebProposalArtifact(input: ArtifactInput): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO artifacts (workspace_id, run_id, agent, kind, day, title, content, source_refs, status)
    VALUES (
      ${input.workspaceId},
      ${input.runId},
      ${input.agent},
      ${input.kind},
      ${input.day},
      ${input.title},
      ${sql.json(input.content as JsonParam)},
      ${sql.json(input.sourceRefs as JsonParam)},
      'proposed'
    )
    RETURNING id
  `;
  return rows[0].id;
}
