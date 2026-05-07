import { randomUUID } from 'node:crypto';
import { sql } from '@/db';
import type { PipelineInput } from '@/server/flows/pipeline.types';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';
import { logger } from '@/server/observability/logger';
import {
  buildPipelineJobMetadata,
  isPipelineJobUniqueViolation,
  normalizePipelineJobIdempotencyKey,
  normalizePipelineJobMaxAttempts,
} from '@/server/jobs/pipelineJob.policy';
import { getExistingIdempotentPipelineJob, readPipelineQueueDepth } from '@/server/jobs/pipelineJob.queueRepo';
import {
  toPipelineJobRecord,
  type PipelineJobJsonParam,
  type PipelineJobSqlClient,
} from '@/server/jobs/pipelineJob.sql';
import type { DbPipelineJobRow, EnqueuePipelineJobResult, PipelineJobRecord } from '@/server/jobs/pipelineJob.types';

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
      const txSql = tx as unknown as PipelineJobSqlClient;

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

      return createQueuedPipelineJob({
        idempotencyKey,
        input: normalizedInput,
        maxAttempts,
        route: params.route,
        sqlClient: txSql,
        workspaceId: params.scope.workspaceId,
      });
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

async function createQueuedPipelineJob(params: {
  idempotencyKey: string | null;
  input: PipelineInput;
  maxAttempts: number;
  route: string;
  sqlClient: PipelineJobSqlClient;
  workspaceId: string;
}): Promise<{ job: PipelineJobRecord; reused: boolean }> {
  const jobId = randomUUID();
  const runId = randomUUID();
  const metadata = {
    runMode: params.input.runMode ?? null,
    trigger: params.input.trigger ?? 'manual',
    workspaceId: params.workspaceId,
    topicId: params.input.topicId ?? null,
    idempotencyKey: params.idempotencyKey,
    ...buildPipelineJobMetadata({
      attempt: 0,
      jobId,
      maxAttempts: params.maxAttempts,
      route: params.route,
      status: 'queued',
    }),
  };

  await params.sqlClient`
    INSERT INTO runs (id, workspace_id, kind, status, started_at, metadata)
    VALUES (
      ${runId},
      ${params.workspaceId},
      'pipeline',
      'running',
      now(),
      ${params.sqlClient.json(metadata as PipelineJobJsonParam)}
    )
  `;

  const rows = await params.sqlClient<Array<DbPipelineJobRow>>`
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
      ${params.workspaceId},
      ${runId},
      ${params.route},
      'queued',
      ${params.sqlClient.json(params.input as PipelineJobJsonParam)},
      ${params.idempotencyKey},
      ${params.maxAttempts},
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
}
