import { createRun, appendStep, finishRun } from '@/server/observability/runTrace.store';
import { RunStep } from '@/server/observability/runTrace.types';
import { distillerAgent, DistillerInput } from '@/server/agents/distiller.agent';

export async function distillFlow(input: DistillerInput): Promise<string> {
  const runId = await createRun('distill');

  try {
    const step: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'distill',
      status: 'running',
      input,
    };
    await appendStep(runId, step);

    // Execute distiller agent
    const result = await distillerAgent(input, async (agentStep) => {
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
