import { sql } from '@/db';
import { logger } from '@/server/observability/logger';
import {
  buildPipelineJobMetadata,
  pipelineJobRetryDelayMs,
  serializePipelineJobError,
} from '@/server/jobs/pipelineJob.policy';
import { readPipelineQueueDepth } from '@/server/jobs/pipelineJob.queueRepo';
import { patchRunForPipelineJob } from '@/server/jobs/pipelineJob.runMetadata';
import type { PipelineJobJsonParam } from '@/server/jobs/pipelineJob.sql';
import type { PipelineJobRecord } from '@/server/jobs/pipelineJob.types';

export async function markPipelineJobSucceeded(job: PipelineJobRecord): Promise<void> {
  await sql`
    UPDATE pipeline_jobs
    SET
      status = 'succeeded',
      completed_at = now(),
      updated_at = now(),
      lease_expires_at = null,
      leased_at = null,
      worker_id = null
    WHERE id = ${job.id}
  `;

  await patchRunForPipelineJob(sql, {
    runId: job.runId,
    metadata: buildPipelineJobMetadata({
      attempt: job.attempts,
      jobId: job.id,
      maxAttempts: job.maxAttempts,
      route: job.route,
      status: 'succeeded',
    }),
  });

  const queueDepth = await readPipelineQueueDepth(sql, job.workspaceId);
  logger.info('pipeline.job.completed', {
    attempt: job.attempts,
    jobId: job.id,
    queueDepth,
    runId: job.runId,
    workspaceId: job.workspaceId,
  });
}

export async function markPipelineJobRetrying(job: PipelineJobRecord, error: unknown): Promise<void> {
  const nextAttemptAt = new Date(Date.now() + pipelineJobRetryDelayMs(job.attempts));
  const serializedError = serializePipelineJobError(error);

  await sql`
    UPDATE pipeline_jobs
    SET
      status = 'retrying',
      available_at = ${nextAttemptAt.toISOString()},
      updated_at = now(),
      lease_expires_at = null,
      leased_at = null,
      worker_id = null,
      last_error = ${sql.json(serializedError as PipelineJobJsonParam)}
    WHERE id = ${job.id}
  `;

  await patchRunForPipelineJob(sql, {
    runId: job.runId,
    status: 'running',
    clearEndedAt: true,
    metadata: buildPipelineJobMetadata({
      attempt: job.attempts,
      jobId: job.id,
      maxAttempts: job.maxAttempts,
      route: job.route,
      status: 'retrying',
      error: serializedError,
    }),
  });

  const queueDepth = await readPipelineQueueDepth(sql, job.workspaceId);
  logger.warn('pipeline.job.retry_scheduled', {
    attempt: job.attempts,
    availableAt: nextAttemptAt.toISOString(),
    jobId: job.id,
    queueDepth,
    runId: job.runId,
    workspaceId: job.workspaceId,
  });
}

export async function markPipelineJobFailed(job: PipelineJobRecord, error: unknown): Promise<void> {
  const serializedError = serializePipelineJobError(error);

  await sql`
    UPDATE pipeline_jobs
    SET
      status = 'failed',
      completed_at = now(),
      updated_at = now(),
      lease_expires_at = null,
      leased_at = null,
      worker_id = null,
      last_error = ${sql.json(serializedError as PipelineJobJsonParam)}
    WHERE id = ${job.id}
  `;

  await patchRunForPipelineJob(sql, {
    runId: job.runId,
    status: 'error',
    metadata: buildPipelineJobMetadata({
      attempt: job.attempts,
      jobId: job.id,
      maxAttempts: job.maxAttempts,
      route: job.route,
      status: 'failed',
      error: serializedError,
    }),
  });

  const queueDepth = await readPipelineQueueDepth(sql, job.workspaceId);
  logger.error('pipeline.job.failed', {
    attempt: job.attempts,
    error: serializedError.message,
    jobId: job.id,
    queueDepth,
    runId: job.runId,
    workspaceId: job.workspaceId,
  });
}
