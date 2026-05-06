import { appendStep, finishRun } from '@/server/observability/runTrace.store';
import type { RunStep } from '@/server/observability/runTrace.types';
import type { PipelineResult } from '@/server/flows/pipeline.types';

export async function appendPipelineFlowStep(
  runId: string,
  step: Omit<RunStep, 'timestamp' | 'type'>,
): Promise<void> {
  await appendStep(runId, {
    timestamp: new Date().toISOString(),
    type: 'flow',
    ...step,
  });
}

export async function completePipelineRun(result: PipelineResult): Promise<PipelineResult> {
  await appendPipelineFlowStep(result.runId, {
    name: 'pipeline',
    status: 'ok',
    output: result,
  });
  await finishRun(result.runId, result.status);

  return result;
}

export async function finishPipelineRunAsError(runId: string): Promise<void> {
  await finishRun(runId, 'error');
}
