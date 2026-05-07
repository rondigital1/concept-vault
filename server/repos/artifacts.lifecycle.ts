import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { ArtifactRow, JsonParam } from '@/server/repos/artifacts.types';

export async function approveArtifact(
  scope: WorkspaceScope,
  artifactId: string,
  reviewMetadata?: Record<string, unknown>,
): Promise<boolean> {
  let approved = false;
  const metadataPatch =
    reviewMetadata && Object.keys(reviewMetadata).length > 0 ? reviewMetadata : null;

  await sql.begin(async (tx) => {
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
