import { sql } from '@/db';
import { logger } from '@/server/observability/logger';
import { buildPipelineJobMetadata, DEFAULT_PIPELINE_JOB_LEASE_MS } from '@/server/jobs/pipelineJob.policy';
import { readPipelineQueueDepth } from '@/server/jobs/pipelineJob.queueRepo';
import { patchRunForPipelineJob } from '@/server/jobs/pipelineJob.runMetadata';
import { toPipelineJobRecord } from '@/server/jobs/pipelineJob.sql';
import type { AcquiredPipelineJob, AcquiredPipelineJobRow } from '@/server/jobs/pipelineJob.types';

export async function acquireNextPipelineJob(params: {
  leaseMs?: number;
  now?: Date;
  workerId: string;
}): Promise<AcquiredPipelineJob | null> {
  const now = params.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + (params.leaseMs ?? DEFAULT_PIPELINE_JOB_LEASE_MS));

  const rows = await sql<Array<AcquiredPipelineJobRow>>`
    WITH candidate AS (
      SELECT id, status AS previous_status
      FROM pipeline_jobs
      WHERE (
        status IN ('queued', 'retrying')
        AND available_at <= ${now.toISOString()}
      ) OR (
        status = 'running'
        AND lease_expires_at IS NOT NULL
        AND lease_expires_at <= ${now.toISOString()}
      )
      ORDER BY
        CASE WHEN status = 'running' THEN 0 ELSE 1 END,
        available_at ASC,
        created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE pipeline_jobs jobs
    SET
      status = 'running',
      attempts = jobs.attempts + 1,
      leased_at = ${now.toISOString()},
      lease_expires_at = ${leaseExpiresAt.toISOString()},
      worker_id = ${params.workerId},
      updated_at = ${now.toISOString()}
    FROM candidate
    WHERE jobs.id = candidate.id
    RETURNING
      jobs.id,
      jobs.workspace_id,
      jobs.run_id,
      jobs.route,
      jobs.status,
      jobs.payload,
      jobs.idempotency_key,
      jobs.attempts,
      jobs.max_attempts,
      jobs.available_at,
      jobs.leased_at,
      jobs.lease_expires_at,
      jobs.worker_id,
      jobs.last_error,
      jobs.completed_at,
      jobs.created_at,
      jobs.updated_at,
      candidate.previous_status
  `;

  if (!rows[0]) {
    return null;
  }

  const row = rows[0];
  const record = toPipelineJobRecord(row);
  await patchRunForPipelineJob(sql, {
    runId: record.runId,
    status: 'running',
    clearEndedAt: true,
    metadata: buildPipelineJobMetadata({
      attempt: record.attempts,
      jobId: record.id,
      maxAttempts: record.maxAttempts,
      route: record.route,
      status: 'running',
      workerId: params.workerId,
      error: record.lastError,
    }),
  });

  const queueDepth = await readPipelineQueueDepth(sql, record.workspaceId);
  logger.info('pipeline.job.acquired', {
    attempt: record.attempts,
    jobId: record.id,
    previousStatus: row.previous_status,
    queueDepth,
    route: record.route,
    runId: record.runId,
    workerId: params.workerId,
    workspaceId: record.workspaceId,
  });

  return {
    ...record,
    previousStatus: row.previous_status,
  };
}
