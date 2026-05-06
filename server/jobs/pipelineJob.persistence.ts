import { randomUUID } from 'node:crypto';
import { sql } from '@/db';
import type { PipelineInput } from '@/server/flows/pipeline.types';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { logger } from '@/server/observability/logger';
import {
  buildPipelineJobMetadata,
  DEFAULT_PIPELINE_JOB_LEASE_MS,
  isPipelineJobUniqueViolation,
  normalizePipelineJobIdempotencyKey,
  normalizePipelineJobMaxAttempts,
  pipelineJobRetryDelayMs,
  serializePipelineJobError,
} from '@/server/jobs/pipelineJob.policy';
import type {
  AcquiredPipelineJob,
  AcquiredPipelineJobRow,
  DbPipelineJobRow,
  EnqueuePipelineJobResult,
  PipelineJobRecord,
} from '@/server/jobs/pipelineJob.types';

type JsonParam = Parameters<typeof sql.json>[0];
type SqlClient = typeof sql;

function toPipelineJobRecord(row: DbPipelineJobRow): PipelineJobRecord {
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

async function patchRunForPipelineJob(
  sqlClient: SqlClient,
  params: {
    runId: string;
    metadata: Record<string, unknown>;
    status?: 'running' | 'error';
    clearEndedAt?: boolean;
  },
): Promise<void> {
  const status = params.status ?? null;
  const endedAtClause =
    params.clearEndedAt === true
      ? sqlClient`ended_at = null,`
      : status === 'error'
        ? sqlClient`ended_at = now(),`
        : sqlClient``;

  await sqlClient`
    UPDATE runs
    SET
      ${endedAtClause}
      status = COALESCE(${status}, status),
      metadata = COALESCE(metadata, '{}'::jsonb) || ${sqlClient.json(params.metadata as JsonParam)}
    WHERE id = ${params.runId}
  `;
}

export async function readPipelineQueueDepth(
  sqlClient: SqlClient,
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

async function getExistingIdempotentPipelineJob(
  sqlClient: SqlClient,
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

export async function enqueuePipelineJob(params: {
  input: PipelineInput;
  maxAttempts?: number;
  route: string;
  scope: WorkspaceScope;
}): Promise<EnqueuePipelineJobResult> {
  const idempotencyKey = normalizePipelineJobIdempotencyKey(params.input.idempotencyKey);
  const maxAttempts = normalizePipelineJobMaxAttempts(params.maxAttempts);
  const normalizedInput: PipelineInput = {
    ...params.input,
    workspaceId: params.scope.workspaceId,
  };

  let job: { job: PipelineJobRecord; reused: boolean };

  try {
    job = await sql.begin(async (tx) => {
      const txSql = tx as unknown as SqlClient;

      if (idempotencyKey) {
        const existing = await getExistingIdempotentPipelineJob(
          txSql,
          params.scope.workspaceId,
          idempotencyKey,
        );

        if (existing) {
          return { job: existing, reused: true };
        }
      }

      const jobId = randomUUID();
      const runId = randomUUID();
      const metadata = {
        runMode: normalizedInput.runMode ?? null,
        trigger: normalizedInput.trigger ?? 'manual',
        workspaceId: params.scope.workspaceId,
        topicId: normalizedInput.topicId ?? null,
        idempotencyKey,
        ...buildPipelineJobMetadata({
          attempt: 0,
          jobId,
          maxAttempts,
          route: params.route,
          status: 'queued',
        }),
      };

      await txSql`
        INSERT INTO runs (id, workspace_id, kind, status, started_at, metadata)
        VALUES (
          ${runId},
          ${params.scope.workspaceId},
          'pipeline',
          'running',
          now(),
          ${txSql.json(metadata as JsonParam)}
        )
      `;

      const rows = await txSql<Array<DbPipelineJobRow>>`
        INSERT INTO pipeline_jobs (
          id,
          workspace_id,
          run_id,
          route,
          status,
          payload,
          idempotency_key,
          max_attempts,
          available_at,
          created_at,
          updated_at
        )
        VALUES (
          ${jobId},
          ${params.scope.workspaceId},
          ${runId},
          ${params.route},
          'queued',
          ${txSql.json(normalizedInput as JsonParam)},
          ${idempotencyKey},
          ${maxAttempts},
          now(),
          now(),
          now()
        )
        RETURNING
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
      `;

      return {
        job: toPipelineJobRecord(rows[0]),
        reused: false,
      };
    });
  } catch (error) {
    if (!idempotencyKey || !isPipelineJobUniqueViolation(error)) {
      throw error;
    }

    const existing = await getExistingIdempotentPipelineJob(sql, params.scope.workspaceId, idempotencyKey);

    if (!existing) {
      throw error;
    }

    job = {
      job: existing,
      reused: true,
    };
  }

  const queueDepth = await readPipelineQueueDepth(sql, params.scope.workspaceId);
  logger.info('pipeline.job.enqueued', {
    jobId: job.job.id,
    runId: job.job.runId,
    route: params.route,
    reused: job.reused,
    status: job.job.status,
    queueDepth,
    workspaceId: params.scope.workspaceId,
  });

  return {
    jobId: job.job.id,
    runId: job.job.runId,
    status: job.job.status,
    reused: job.reused,
    queueDepth,
  };
}

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
      last_error = ${sql.json(serializedError as JsonParam)}
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
      last_error = ${sql.json(serializedError as JsonParam)}
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
