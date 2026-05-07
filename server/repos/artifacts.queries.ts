import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { ArtifactRow } from '@/server/repos/artifacts.types';

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

export async function listArtifactsByAgentAndKind(
  scope: WorkspaceScope,
  agent: string,
  kind: string,
  options?: { day?: string; status?: string },
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
