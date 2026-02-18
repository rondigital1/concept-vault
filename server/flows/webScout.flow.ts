/**
 * WebScout Flow
 *
 * Orchestrates the webScout ReAct agent with run tracing.
 * Creates a run, executes the agent, and records all steps.
 */

import { createRun, appendStep, finishRun } from '@/server/observability/runTrace.store';
import { RunStep } from '@/server/observability/runTrace.types';
import { webScoutGraph, WebScoutInput, WebScoutOutput } from '@/server/agents/webScout.graph';

export interface WebScoutFlowResult {
  runId: string;
  output: WebScoutOutput;
}

async function executeWebScoutFlow(runId: string, input: WebScoutInput): Promise<WebScoutOutput> {
  try {
    const flowStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'webScout',
      status: 'running',
      input,
    };
    await appendStep(runId, flowStep);

    const result = await webScoutGraph(
      input,
      async (agentStep) => {
        await appendStep(runId, agentStep);
      },
      runId,
    );

    const completeStep: RunStep = {
      timestamp: new Date().toISOString(),
      type: 'flow',
      name: 'webScout',
      status: 'ok',
      output: result,
    };
    await appendStep(runId, completeStep);

    await finishRun(runId, 'ok');
    return result;
  } catch (error) {
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

/**
 * Starts a WebScout run without awaiting completion.
 * Useful for pages that poll live run progress via runId.
 */
export async function startWebScoutFlow(input: WebScoutInput): Promise<{ runId: string }> {
  const runId = await createRun('webScout');

  setImmediate(() => {
    void executeWebScoutFlow(runId, input).catch((error) => {
      console.error('WebScout background run failed:', error);
    });
  });

  return { runId };
}

/**
 * WebScout Flow — runs synchronously and returns result.
 */
export async function webScoutFlow(input: WebScoutInput): Promise<WebScoutFlowResult> {
  const runId = await createRun('webScout');
  const output = await executeWebScoutFlow(runId, input);
  return { runId, output };
}
