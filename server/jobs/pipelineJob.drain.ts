import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import type { PipelineInput, PipelineResult } from '@/server/flows/pipeline.types';
import { pipelineFlow } from '@/server/flows/pipeline.flow';
import { logger } from '@/server/observability/logger';
import {
  DEFAULT_PIPELINE_JOB_DRAIN_LIMIT,
  isPipelineJobPayload,
  serializePipelineJobError,
  shouldRetryPipelineJob,
} from '@/server/jobs/pipelineJob.policy';
import {
  acquireNextPipelineJob,
  markPipelineJobFailed,
  markPipelineJobRetrying,
  markPipelineJobSucceeded,
} from '@/server/jobs/pipelineJob.persistence';
import type { PipelineWorkerDrainResult } from '@/server/jobs/pipelineJob.types';

export function isPipelineInlineExecutionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PIPELINE_INLINE_EXECUTION_ENABLED === 'true';
}

export function schedulePipelineJobDrain(maxJobs = DEFAULT_PIPELINE_JOB_DRAIN_LIMIT): void {
  try {
    after(() => {
      void drainPipelineJobQueue({ maxJobs }).catch((error) => {
        logger.error('pipeline.worker.schedule_failed', {
          error: serializePipelineJobError(error).message,
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

export async function drainPipelineJobQueue(params?: {
  leaseMs?: number;
  maxJobs?: number;
  workerId?: string;
}): Promise<PipelineWorkerDrainResult> {
  const maxJobs = Math.max(1, params?.maxJobs ?? DEFAULT_PIPELINE_JOB_DRAIN_LIMIT);
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
              error: serializePipelineJobError(error).message,
            });

            if (shouldRetryPipelineJob(acquired)) {
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

export async function executePipelineInline(input: PipelineInput): Promise<PipelineResult> {
  return pipelineFlow(input);
}
