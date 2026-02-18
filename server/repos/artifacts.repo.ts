/**
 * Artifacts Repository
 *
 * Database operations for artifact lifecycle management.
 * Handles: insert, approve, reject, supersede, and listing operations.
 */

import { sql } from '@/db';

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

// ---------- Status Transitions ----------

/**
 * Approve an artifact.
 * - Transitions status from 'proposed' to 'approved'
 * - Supersedes any existing approved artifact with same (agent, kind, day)
 * - Sets reviewed_at timestamp
 * 
 * Returns true if approved, false if artifact not found or already processed.
 */
export async function approveArtifact(artifactId: string): Promise<boolean> {
  // First, get the artifact to approve
  const artifact = await sql<Array<ArtifactRow>>`
    SELECT * FROM artifacts WHERE id = ${artifactId} AND status = 'proposed'
  `;

  if (artifact.length === 0) {
    return false;
  }

  const { agent, kind, day } = artifact[0];

  // Start a transaction to supersede old and approve new
  await sql.begin(async (tx) => {
    // Supersede any existing approved artifact with same (agent, kind, day)
    await tx`
      UPDATE artifacts
      SET status = 'superseded', reviewed_at = now()
      WHERE agent = ${agent}
        AND kind = ${kind}
        AND day = ${day}
        AND status = 'approved'
        AND id != ${artifactId}
    `;

    // Approve the new artifact
    await tx`
      UPDATE artifacts
      SET status = 'approved', reviewed_at = now()
      WHERE id = ${artifactId}
    `;
  });

  return true;
}

/**
 * Reject an artifact.
 * - Transitions status from 'proposed' to 'rejected'
 * - Sets reviewed_at timestamp
 * 
 * Returns true if rejected, false if artifact not found or already processed.
 */
export async function rejectArtifact(artifactId: string): Promise<boolean> {
  const result = await sql<Array<{ id: string }>>`
    UPDATE artifacts
    SET status = 'rejected', reviewed_at = now()
    WHERE id = ${artifactId} AND status = 'proposed'
    RETURNING id
  `;

  return result.length > 0;
}

// ---------- Query Operations ----------

/**
 * Get artifact by ID.
 */
export async function getArtifactById(artifactId: string): Promise<ArtifactRow | null> {
  const rows = await sql<Array<ArtifactRow>>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE id = ${artifactId}
  `;
  return rows[0] ?? null;
}

/**
 * List artifacts in the inbox (proposed status) for a given day.
 */
export async function listInboxArtifacts(day: string): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE day = ${day} AND status = 'proposed'
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * List approved (active) artifacts for a given day.
 */
export async function listActiveArtifacts(day: string): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE day = ${day} AND status = 'approved'
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * List all artifacts for a given day (any status).
 */
export async function listArtifactsByDay(day: string): Promise<ArtifactRow[]> {
  const rows = await sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE day = ${day}
    ORDER BY created_at ASC
  `;
  return rows;
}

/**
 * List artifacts by agent and kind.
 */
export async function listArtifactsByAgentAndKind(
  agent: string,
  kind: string,
  options?: { day?: string; status?: string }
): Promise<ArtifactRow[]> {
  let query = sql<ArtifactRow[]>`
    SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
    FROM artifacts
    WHERE agent = ${agent} AND kind = ${kind}
  `;

  if (options?.day) {
    query = sql<ArtifactRow[]>`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
      FROM artifacts
      WHERE agent = ${agent} AND kind = ${kind} AND day = ${options.day}
      ${options.status ? sql`AND status = ${options.status}` : sql``}
      ORDER BY created_at ASC
    `;
  } else if (options?.status) {
    query = sql<ArtifactRow[]>`
      SELECT id, run_id, agent, kind, day, title, content, source_refs, status, created_at, reviewed_at, read_at
      FROM artifacts
      WHERE agent = ${agent} AND kind = ${kind} AND status = ${options.status}
      ORDER BY created_at ASC
    `;
  }

  return query;
}

/**
 * Count artifacts by status for a given day.
 */
export async function countArtifactsByStatus(day: string): Promise<Record<string, number>> {
  const rows = await sql<Array<{ status: string; count: string }>>`
    SELECT status, COUNT(*)::text as count
    FROM artifacts
    WHERE day = ${day}
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
