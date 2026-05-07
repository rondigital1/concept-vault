import { sql } from '@/db';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import type { DbPipelineJobRow, PipelineJobRecord } from '@/server/jobs/pipelineJob.types';
import { toPipelineJobRecord, type PipelineJobSqlClient } from '@/server/jobs/pipelineJob.sql';

export async function readPipelineQueueDepth(
  sqlClient: PipelineJobSqlClient,
  workspaceId?: string,
): Promise<number> {
  const rows = workspaceId
    ? await sqlClient<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM pipeline_jobs
        WHERE workspace_id = ${workspaceId}
          AND status IN ('queued', 'retrying')
      `
    : await sqlClient<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM pipeline_jobs
        WHERE status IN ('queued', 'retrying')
      `;

  return rows[0]?.count ?? 0;
}

export async function getExistingIdempotentPipelineJob(
  sqlClient: PipelineJobSqlClient,
  workspaceId: string,
  idempotencyKey: string,
): Promise<PipelineJobRecord | null> {
  const rows = await sqlClient<Array<DbPipelineJobRow>>`
    SELECT
      id,
      workspace_id,
      run_id,
      route,
      status,
      payload,
      idempotency_key,
      attempts,
      max_attempts,
      available_at,
      leased_at,
      lease_expires_at,
      worker_id,
      last_error,
      completed_at,
      created_at,
      updated_at
    FROM pipeline_jobs
    WHERE workspace_id = ${workspaceId}
      AND idempotency_key = ${idempotencyKey}
      AND status <> 'failed'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return rows[0] ? toPipelineJobRecord(rows[0]) : null;
}

export async function getPipelineJob(scope: WorkspaceScope, jobId: string): Promise<PipelineJobRecord | null> {
  const rows = await sql<Array<DbPipelineJobRow>>`
    SELECT
      id,
      workspace_id,
      run_id,
      route,
      status,
      payload,
      idempotency_key,
      attempts,
      max_attempts,
      available_at,
      leased_at,
      lease_expires_at,
      worker_id,
      last_error,
      completed_at,
      created_at,
      updated_at
    FROM pipeline_jobs
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${jobId}
  `;

  return rows[0] ? toPipelineJobRecord(rows[0]) : null;
}
