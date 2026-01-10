import { createRun, appendStep, finishRun } from '@/server/observability/runTrace.store';
import { RunStep } from '@/server/observability/runTrace.types';
import { curatorAgent, CuratorInput } from '@/server/agents/curator.agent';

export async function curateFlow(input: CuratorInput): Promise<string> {
  const runId = await createRun('curate');

  try {
    const step: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'curate',
      status: 'running',
      input,
    };
    await appendStep(runId, step);

    // Execute curator agent
    const result = await curatorAgent(input, async (agentStep) => {
      await appendStep(runId, agentStep);
    });

    step.status = 'ok';
    step.output = result;
    await appendStep(runId, step);

    await finishRun(runId, 'ok');
  } catch (error) {
    await finishRun(runId, 'error');
    throw error;
  }

  return runId;
}
