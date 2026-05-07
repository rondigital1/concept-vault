import { sql } from '@/db';
import type { PipelineInput } from '@/server/flows/pipeline.types';
import type { DbPipelineJobRow, PipelineJobRecord } from '@/server/jobs/pipelineJob.types';

export type PipelineJobJsonParam = Parameters<typeof sql.json>[0];
export type PipelineJobSqlClient = typeof sql;

export function toPipelineJobRecord(row: DbPipelineJobRow): PipelineJobRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    runId: row.run_id,
    route: row.route,
    status: row.status,
    input: row.payload as PipelineInput,
    idempotencyKey: row.idempotency_key,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    leasedAt: row.leased_at,
    leaseExpiresAt: row.lease_expires_at,
    workerId: row.worker_id,
    lastError: row.last_error,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
