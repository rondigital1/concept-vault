/**
 * WebScout Repository
 *
 * Database operations for the webScout agent.
 * Handles document queries for deriving searches and artifact creation.
 */

import { sql } from '@/db';

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
export async function getRecentDocumentsForQuery(limit: number): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

/**
 * Fetch documents filtered by tags
 */
export async function getDocumentsByTags(
  tags: string[],
  limit: number
): Promise<DocumentRow[]> {
  const rows = await sql<DocumentRow[]>`
    SELECT id, title, content, tags
    FROM documents
    WHERE tags && ${tags}
    ORDER BY imported_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

// ---------- Deduplication ----------

/**
 * Check if a URL already exists in documents (for deduplication)
 */
export async function checkUrlExists(url: string): Promise<boolean> {
  const rows = await sql<Array<{ exists: boolean }>>`
    SELECT EXISTS(
      SELECT 1 FROM documents WHERE source = ${url}
    ) as exists
  `;
  return rows[0]?.exists ?? false;
}

/**
 * Check multiple URLs for existence (batch dedup)
 */
export async function filterExistingUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];

  const rows = await sql<Array<{ source: string }>>`
    SELECT source FROM documents WHERE source = ANY(${urls})
  `;

  const existingUrls = new Set(rows.map((r) => r.source));
  return urls.filter((url) => !existingUrls.has(url));
}

// ---------- Artifact Operations ----------

/**
 * Save a web proposal artifact to the database
 */
export async function insertWebProposalArtifact(input: ArtifactInput): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO artifacts (run_id, agent, kind, day, title, content, source_refs, status)
    VALUES (
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
