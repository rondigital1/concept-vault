/**
 * Artifacts Repository
 *
 * Database operations for artifact lifecycle management.
 * Handles: insert, approve, reject, supersede, and listing operations.
 */

import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

// Type accepted by sql.json() (postgres JSONValue); used to assert Record<string, unknown> from API/agents.
type JsonParam = Parameters<typeof sql.json>[0];

// ---------- Types ----------

export interface ArtifactRow {
  id: string;
  run_id: string | null;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  status: 'proposed' | 'approved' | 'rejected' | 'superseded';
  created_at: string;
  reviewed_at: string | null;
  read_at: string | null;
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

// ---------- Insert Operations ----------

/**
 * Insert a new artifact with 'proposed' status.
 */
export async function insertArtifact(input: ArtifactInput): Promise<string> {
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

// ---------- Status Transitions ----------

/**
 * Approve an artifact.
 * - Transitions status from 'proposed' to 'approved'
 * - Supersedes any existing approved artifact with same (agent, kind, day)
 * - Sets reviewed_at timestamp
 * 
 * Returns true if approved, false if artifact not found or already processed.
 */
export async function approveArtifact(
  scope: WorkspaceScope,
  artifactId: string,
  reviewMetadata?: Record<string, unknown>,
): Promise<boolean> {
  let approved = false;
  const metadataPatch =
    reviewMetadata && Object.keys(reviewMetadata).length > 0 ? reviewMetadata : null;

  // Start a transaction to supersede old and approve new
  await sql.begin(async (tx) => {
    // postgres@3.4.8 typings expose TransactionSql without tag-call signatures.
    // Cast to the root sql tag type for template-query ergonomics.
    const txSql = tx as unknown as typeof sql;

    await txSql`SET LOCAL lock_timeout = '2s'`;
    await txSql`SET LOCAL statement_timeout = '8s'`;

    const artifact = await txSql<Array<Pick<ArtifactRow, 'agent' | 'kind' | 'day'>>>`
      SELECT agent, kind, day
      FROM artifacts
      WHERE id = ${artifactId}
        AND workspace_id = ${scope.workspaceId}
        AND status = 'proposed'
      FOR UPDATE
    `;

    if (artifact.length === 0) {
      return;
    }

    const { agent, kind, day } = artifact[0];

    // Supersede any existing approved artifact with same (agent, kind, day)
    await txSql`
      UPDATE artifacts
      SET status = 'superseded', reviewed_at = now()
      WHERE workspace_id = ${scope.workspaceId}
        AND agent = ${agent}
        AND kind = ${kind}
        AND day = ${day}
        AND status = 'approved'
        AND id != ${artifactId}
    `;

    // Approve the new artifact
    const updated = await txSql<Array<{ id: string }>>`
      UPDATE artifacts
      SET
        status = 'approved',
        reviewed_at = now()
        ${metadataPatch
          ? sql`, source_refs = COALESCE(source_refs, '{}'::jsonb) || ${sql.json(metadataPatch as JsonParam)}`
          : sql``}
      WHERE id = ${artifactId} AND status = 'proposed'
        AND workspace_id = ${scope.workspaceId}
      RETURNING id
    `;

    approved = updated.length > 0;
  });

  return approved;
}

export async function mergeArtifactReviewMetadata(
  scope: WorkspaceScope,
  artifactId: string,
  reviewMetadata: Record<string, unknown>,
): Promise<boolean> {
  if (Object.keys(reviewMetadata).length === 0) {
    return true;
  }

  const updated = await sql<Array<{ id: string }>>`
    UPDATE artifacts
    SET source_refs = COALESCE(source_refs, '{}'::jsonb) || ${sql.json(reviewMetadata as JsonParam)}
    WHERE id = ${artifactId}
      AND workspace_id = ${scope.workspaceId}
      AND status = 'approved'
    RETURNING id
  `;

  return updated.length > 0;
}

/**
 * Reject an artifact.
 * - Transitions status from 'proposed' to 'rejected'
 * - Sets reviewed_at timestamp
 * 
 * Returns true if rejected, false if artifact not found or already processed.
 */
export async function rejectArtifact(scope: WorkspaceScope, artifactId: string): Promise<boolean> {
  let rejected = false;

  await sql.begin(async (tx) => {
    const txSql = tx as unknown as typeof sql;
    await txSql`SET LOCAL lock_timeout = '2s'`;
    await txSql`SET LOCAL statement_timeout = '8s'`;

    const result = await txSql<Array<{ id: string }>>`
      UPDATE artifacts
      SET status = 'rejected', reviewed_at = now()
      WHERE id = ${artifactId}
        AND workspace_id = ${scope.workspaceId}
        AND status = 'proposed'
      RETURNING id
    `;
    rejected = result.length > 0;
  });

  return rejected;
}

// ---------- Query Operations ----------

/**
 * Get artifact by ID.
 */
export async function getArtifactById(
  scope: WorkspaceScope,
  artifactId: string,
): Promise<ArtifactRow | null> {
  const rows = await sql<Array<ArtifactRow>>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE id = ${artifactId}
      AND workspace_id = ${scope.workspaceId}
  `;
  return rows[0] ?? null;
}

/**
 * List artifacts in the inbox (proposed status) for a given day.
 */
export async function listInboxArtifacts(scope: WorkspaceScope, day: string): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND day = ${day}
      AND status = 'proposed'
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * List approved (active) artifacts for a given day.
 */
export async function listActiveArtifacts(scope: WorkspaceScope, day: string): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND day = ${day}
      AND status = 'approved'
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * List all artifacts for a given day (any status).
 */
export async function listArtifactsByDay(scope: WorkspaceScope, day: string): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND day = ${day}
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * List artifacts by agent and kind.
 */
export async function listArtifactsByAgentAndKind(
  scope: WorkspaceScope,
  agent: string,
  kind: string,
  options?: { day?: string; status?: string }
): Promise<ArtifactRow[]> {
  let query = sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND agent = ${agent}
      AND kind = ${kind}
  `;

  if (options?.day) {
    query = sql<ArtifactRow[]>`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
      FROM artifacts
      WHERE workspace_id = ${scope.workspaceId}
        AND agent = ${agent}
        AND kind = ${kind}
        AND day = ${options.day}
      ${options.status ? sql`AND status = ${options.status}` : sql``}
      ORDER BY created_at ASC
    `;
  } else if (options?.status) {
    query = sql<ArtifactRow[]>`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
      FROM artifacts
      WHERE workspace_id = ${scope.workspaceId}
        AND agent = ${agent}
        AND kind = ${kind}
        AND status = ${options.status}
      ORDER BY created_at ASC
    `;
  }

  return query;
}

/**
 * List all artifacts created by a specific run.
 */
export async function listArtifactsByRunId(
  scope: WorkspaceScope,
  runId: string,
): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND run_id = ${runId}
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * Count artifacts by status for a given day.
 */
export async function countArtifactsByStatus(
  scope: WorkspaceScope,
  day: string,
): Promise<Record<string, number>> {
  const rows = await sql<Array<{ status: string; count: string }>>`
    SELECT status, COUNT(*)::text as count
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND day = ${day}
    GROUP BY status
  `;

  const counts: Record<string, number> = {
    proposed: 0,
    approved: 0,
    rejected: 0,
    superseded: 0,
  };

  for (const row of rows) {
    counts[row.status] = parseInt(row.count, 10);
  }

  return counts;
}
