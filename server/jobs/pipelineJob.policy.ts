import type { PipelineInput } from '@/server/flows/pipeline.types';
import type { PipelineJobRecord, PipelineJobStatus } from '@/server/jobs/pipelineJob.types';

export const DEFAULT_PIPELINE_JOB_MAX_ATTEMPTS = 3;
export const DEFAULT_PIPELINE_JOB_LEASE_MS = 15 * 60_000;
export const DEFAULT_PIPELINE_JOB_DRAIN_LIMIT = 3;

export function normalizePipelineJobIdempotencyKey(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

export function normalizePipelineJobMaxAttempts(value: number | undefined): number {
  return Math.max(1, Math.min(10, value ?? DEFAULT_PIPELINE_JOB_MAX_ATTEMPTS));
}

export function buildPipelineJobMetadata(params: {
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

export function serializePipelineJobError(error: unknown): Record<string, unknown> {
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

export function isPipelineJobUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === '23505';
}

export function pipelineJobRetryDelayMs(attempt: number): number {
  return Math.min(30_000 * 2 ** Math.max(attempt - 1, 0), 5 * 60_000);
}

export function shouldRetryPipelineJob(job: PipelineJobRecord): boolean {
  return job.attempts < job.maxAttempts;
}

export function isPipelineJobPayload(value: unknown): value is PipelineInput {
  return true;
}
