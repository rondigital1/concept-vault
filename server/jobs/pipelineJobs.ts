import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { sql } from '@/db';
import type { PipelineInput, PipelineResult } from '@/server/flows/pipeline.flow';
import { pipelineFlow } from '@/server/flows/pipeline.flow';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { logger } from '@/server/observability/logger';

type JsonParam = Parameters<typeof sql.json>[0];
type SqlClient = typeof sql;

export type PipelineJobStatus = 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed';

export interface PipelineJobRecord {
  id: string;
  workspaceId: string;
  runId: string;
  route: string;
  status: PipelineJobStatus;
  input: PipelineInput;
  idempotencyKey: string | null;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  leasedAt: string | null;
  leaseExpiresAt: string | null;
  workerId: string | null;
  lastError: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueuePipelineJobResult {
  jobId: string;
  runId: string;
  status: PipelineJobStatus;
  reused: boolean;
  queueDepth: number;
}

export interface PipelineWorkerDrainResult {
  completed: number;
  failed: number;
  processed: number;
  retried: number;
  workerId: string;
}

interface DbPipelineJobRow {
  id: string;
  workspace_id: string;
  run_id: string;
  route: string;
  status: PipelineJobStatus;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  attempts: number;
  max_attempts: number;
  available_at: string;
  leased_at: string | null;
  lease_expires_at: string | null;
  worker_id: string | null;
  last_error: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AcquiredPipelineJobRow extends DbPipelineJobRow {
  previous_status: PipelineJobStatus;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_LEASE_MS = 15 * 60_000;
const DEFAULT_DRAIN_LIMIT = 3;

function normalizeIdempotencyKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

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

function queueMetadata(params: {
  attempt: number;
  jobId: string;
  maxAttempts: number;
  route: string;
  status: PipelineJobStatus;
  workerId?: string | null;
  error?: Record<string, unknown> | null;
}) {
  return {
    pipelineJob: {
      id: params.jobId,
      status: params.status,
      attempts: params.attempt,
      maxAttempts: params.maxAttempts,
      route: params.route,
      workerId: params.workerId ?? null,
      lastError: params.error ?? null,
      updatedAt: new Date().toISOString(),
    },
  };
}

function errorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    message: typeof error === 'string' ? error : JSON.stringify(error),
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === '23505';
}

function retryDelayMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(attempt - 1, 0), 5 * 60_000);
}

function isPipelineJobPayload(value: unknown): value is PipelineInput {
  return true;
}

async function patchRunForJob(
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

async function readQueueDepth(sqlClient: SqlClient, workspaceId?: string): Promise<number> {
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

async function getExistingIdempotentJob(
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

export function isPipelineInlineExecutionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PIPELINE_INLINE_EXECUTION_ENABLED === 'true';
}

export function schedulePipelineJobDrain(maxJobs = DEFAULT_DRAIN_LIMIT): void {
  try {
    after(() => {
      void drainPipelineJobQueue({ maxJobs }).catch((error) => {
        logger.error('pipeline.worker.schedule_failed', {
          error: errorPayload(error).message,
          maxJobs,
        });
      });
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return;
    }

    throw error;
  }
}

export async function enqueuePipelineJob(params: {
  input: PipelineInput;
  maxAttempts?: number;
  route: string;
  scope: WorkspaceScope;
}): Promise<EnqueuePipelineJobResult> {
  const idempotencyKey = normalizeIdempotencyKey(params.input.idempotencyKey);
  const maxAttempts = Math.max(1, Math.min(10, params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS));
  const normalizedInput: PipelineInput = {
    ...params.input,
    workspaceId: params.scope.workspaceId,
  };

  let job: { job: PipelineJobRecord; reused: boolean };

  try {
    job = await sql.begin(async (tx) => {
      const txSql = tx as unknown as SqlClient;

      if (idempotencyKey) {
        const existing = await getExistingIdempotentJob(
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
        ...queueMetadata({
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
    if (!idempotencyKey || !isUniqueViolation(error)) {
      throw error;
    }

    const existing = await getExistingIdempotentJob(sql, params.scope.workspaceId, idempotencyKey);
    if (!existing) {
      throw error;
    }

    job = {
      job: existing,
      reused: true,
    };
  }

  const queueDepth = await readQueueDepth(sql, params.scope.workspaceId);
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

async function acquireNextPipelineJob(params: {
  leaseMs?: number;
  now?: Date;
  workerId: string;
}): Promise<(PipelineJobRecord & { previousStatus: PipelineJobStatus }) | null> {
  const now = params.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + (params.leaseMs ?? DEFAULT_LEASE_MS));

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
  await patchRunForJob(sql, {
    runId: record.runId,
    status: 'running',
    clearEndedAt: true,
    metadata: queueMetadata({
      attempt: record.attempts,
      jobId: record.id,
      maxAttempts: record.maxAttempts,
      route: record.route,
      status: 'running',
      workerId: params.workerId,
      error: record.lastError,
    }),
  });

  const queueDepth = await readQueueDepth(sql, record.workspaceId);
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

async function markPipelineJobSucceeded(job: PipelineJobRecord): Promise<void> {
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

  await patchRunForJob(sql, {
    runId: job.runId,
    metadata: queueMetadata({
      attempt: job.attempts,
      jobId: job.id,
      maxAttempts: job.maxAttempts,
      route: job.route,
      status: 'succeeded',
    }),
  });

  const queueDepth = await readQueueDepth(sql, job.workspaceId);
  logger.info('pipeline.job.completed', {
    attempt: job.attempts,
    jobId: job.id,
    queueDepth,
    runId: job.runId,
    workspaceId: job.workspaceId,
  });
}

async function markPipelineJobRetrying(job: PipelineJobRecord, error: unknown): Promise<void> {
  const nextAttemptAt = new Date(Date.now() + retryDelayMs(job.attempts));
  const serializedError = errorPayload(error);

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

  await patchRunForJob(sql, {
    runId: job.runId,
    status: 'running',
    clearEndedAt: true,
    metadata: queueMetadata({
      attempt: job.attempts,
      jobId: job.id,
      maxAttempts: job.maxAttempts,
      route: job.route,
      status: 'retrying',
      error: serializedError,
    }),
  });

  const queueDepth = await readQueueDepth(sql, job.workspaceId);
  logger.warn('pipeline.job.retry_scheduled', {
    attempt: job.attempts,
    availableAt: nextAttemptAt.toISOString(),
    jobId: job.id,
    queueDepth,
    runId: job.runId,
    workspaceId: job.workspaceId,
  });
}

async function markPipelineJobFailed(job: PipelineJobRecord, error: unknown): Promise<void> {
  const serializedError = errorPayload(error);

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

  await patchRunForJob(sql, {
    runId: job.runId,
    status: 'error',
    metadata: queueMetadata({
      attempt: job.attempts,
      jobId: job.id,
      maxAttempts: job.maxAttempts,
      route: job.route,
      status: 'failed',
      error: serializedError,
    }),
  });

  const queueDepth = await readQueueDepth(sql, job.workspaceId);
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

export async function drainPipelineJobQueue(params?: {
  leaseMs?: number;
  maxJobs?: number;
  workerId?: string;
}): Promise<PipelineWorkerDrainResult> {
  const maxJobs = Math.max(1, params?.maxJobs ?? DEFAULT_DRAIN_LIMIT);
  const workerId = params?.workerId ?? randomUUID();
  let processed = 0;
  let completed = 0;
  let retried = 0;
  let failed = 0;

  await logger.withContext({ workerId }, async () => {
    for (let index = 0; index < maxJobs; index += 1) {
      const acquired = await acquireNextPipelineJob({
        leaseMs: params?.leaseMs,
        workerId,
      });

      if (!acquired) {
        break;
      }

      processed += 1;

      await logger.withContext(
        {
          jobId: acquired.id,
          runId: acquired.runId,
          route: acquired.route,
          workspaceId: acquired.workspaceId,
        },
        async () => {
          try {
            if (!isPipelineJobPayload(acquired.input as Record<string, unknown>)) {
              throw new Error('Queued pipeline job payload is invalid');
            }

            await pipelineFlow(acquired.input, {
              runId: acquired.runId,
              skipIdempotencyLookup: true,
            });
            await markPipelineJobSucceeded(acquired);
            completed += 1;
          } catch (error) {
            logger.error('pipeline.worker.failed', {
              attempt: acquired.attempts,
              jobId: acquired.id,
              runId: acquired.runId,
              workerId,
              workspaceId: acquired.workspaceId,
              error: errorPayload(error).message,
            });

            if (acquired.attempts < acquired.maxAttempts) {
              await markPipelineJobRetrying(acquired, error);
              retried += 1;
            } else {
              await markPipelineJobFailed(acquired, error);
              failed += 1;
            }
          }
        },
      );
    }
  });

  logger.info('pipeline.worker.drained', {
    completed,
    failed,
    processed,
    retried,
    workerId,
  });

  return {
    processed,
    completed,
    retried,
    failed,
    workerId,
  };
}

export async function executePipelineInline(
  input: PipelineInput,
): Promise<PipelineResult> {
  return pipelineFlow(input);
}
