/**
 * WebScout Flow
 *
 * Orchestrates the webScout agent (LangGraph) with run tracing.
 * Creates a run, executes the agent, and records all steps.
 */

import { createRun, appendStep, finishRun } from '@/server/observability/runTrace.store';
import { RunStep } from '@/server/observability/runTrace.types';
import { webScoutGraph, WebScoutInput, WebScoutOutput } from '@/server/agents/webScout.graph';

export interface WebScoutFlowResult {
  runId: string;
  output: WebScoutOutput;
}

/**
 * WebScout Flow
 *
 * Orchestrates the webScout agent (LangGraph) with run tracing.
 */
export async function webScoutFlow(input: WebScoutInput): Promise<WebScoutFlowResult> {
  const runId = await createRun('webScout');

  try {
    // Start flow step
    const flowStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'webScout',
      status: 'running',
      input,
    };
    await appendStep(runId, flowStep);

    // Execute webScout agent (LangGraph), passing runId for artifact association
    const result = await webScoutGraph(
      input,
      async (agentStep) => {
        await appendStep(runId, agentStep);
      },
      runId
    );

    // Complete flow step
    const completeStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'webScout',
      status: 'ok',
      output: result,
    };
    await appendStep(runId, completeStep);

    await finishRun(runId, 'ok');

    return {
      runId,
      output: result,
    };
  } catch (error) {
    // Record error step
    const errorStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'webScout',
      status: 'error',
      error: error instanceof Error ? { message: error.message } : { message: String(error) },
    };
    await appendStep(runId, errorStep);

    await finishRun(runId, 'error');
    throw error;
  }
}
