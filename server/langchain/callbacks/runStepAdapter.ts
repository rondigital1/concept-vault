/**
 * Callback adapter that bridges LangChain callbacks to existing RunStep observability.
 */
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { RunStep } from '@/server/observability/runTrace.types';

type OnStepCallback = (step: RunStep) => void | Promise<void>;

function nowIso(): string {
  return new Date().toISOString();
}

export interface RunStepAdapterOptions {
  runId?: string;
  onStep?: OnStepCallback;
}

/**
 * LangChain callback handler that emits RunStep events.
 * Bridges LangChain's callback system to our existing observability.
 */
export class RunStepCallbackHandler extends BaseCallbackHandler {
  name = 'RunStepCallbackHandler';

  private runId?: string;
  private onStep?: OnStepCallback;
  private stepStartTimes: Map<string, string> = new Map();

  constructor(options: RunStepAdapterOptions = {}) {
    super();
    this.runId = options.runId;
    this.onStep = options.onStep;
  }

  private async emit(step: Partial<RunStep> & { name: string; status: RunStep['status'] }): Promise<void> {
    if (!this.onStep) return;

    const fullStep: RunStep = {
      timestamp: nowIso(),
      type: step.type ?? 'llm',
      ...step,
    };

    try {
      await this.onStep(fullStep);
    } catch (error) {
      console.error('[RunStepCallbackHandler] Failed to emit run step', error);
    }
  }

  async handleLLMStart(
    llm: Serialized,
    prompts: string[],
    runId: string
  ): Promise<void> {
    const startTime = nowIso();
    this.stepStartTimes.set(runId, startTime);

    await this.emit({
      name: llm.id?.[llm.id.length - 1] ?? 'llm_call',
      type: 'llm',
      status: 'running',
      startedAt: startTime,
      input: { promptCount: prompts.length, charCount: prompts.join('').length },
    });
  }

  async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
    const startTime = this.stepStartTimes.get(runId);
    const endTime = nowIso();

    // Extract token usage if available
    const tokenEstimate = output.llmOutput?.tokenUsage?.totalTokens;

    await this.emit({
      name: 'llm_call',
      type: 'llm',
      status: 'ok',
      startedAt: startTime,
      endedAt: endTime,
      output: {
        generationCount: output.generations.length,
      },
      tokenEstimate,
    });

    this.stepStartTimes.delete(runId);
  }

  async handleLLMError(err: Error, runId: string): Promise<void> {
    const startTime = this.stepStartTimes.get(runId);
    const endTime = nowIso();

    await this.emit({
      name: 'llm_call',
      type: 'llm',
      status: 'error',
      startedAt: startTime,
      endedAt: endTime,
      error: { message: err.message },
    });

    this.stepStartTimes.delete(runId);
  }

  async handleToolStart(
    tool: Serialized,
    input: string,
    runId: string
  ): Promise<void> {
    const startTime = nowIso();
    this.stepStartTimes.set(runId, startTime);

    await this.emit({
      name: tool.id?.[tool.id.length - 1] ?? 'tool_call',
      type: 'tool',
      status: 'running',
      startedAt: startTime,
      input: { raw: input.slice(0, 500) },
    });
  }

  async handleToolEnd(output: string, runId: string): Promise<void> {
    const startTime = this.stepStartTimes.get(runId);
    const endTime = nowIso();

    await this.emit({
      name: 'tool_call',
      type: 'tool',
      status: 'ok',
      startedAt: startTime,
      endedAt: endTime,
      output: { raw: output.slice(0, 500) },
    });

    this.stepStartTimes.delete(runId);
  }

  async handleToolError(err: Error, runId: string): Promise<void> {
    const startTime = this.stepStartTimes.get(runId);
    const endTime = nowIso();

    await this.emit({
      name: 'tool_call',
      type: 'tool',
      status: 'error',
      startedAt: startTime,
      endedAt: endTime,
      error: { message: err.message },
    });

    this.stepStartTimes.delete(runId);
  }

  async handleChainStart(
    chain: Serialized,
    inputs: Record<string, unknown>,
    runId: string
  ): Promise<void> {
    const startTime = nowIso();
    this.stepStartTimes.set(runId, startTime);

    await this.emit({
      name: chain.id?.[chain.id.length - 1] ?? 'chain',
      type: 'agent',
      status: 'running',
      startedAt: startTime,
      input: inputs,
    });
  }

  async handleChainEnd(
    outputs: Record<string, unknown>,
    runId: string
  ): Promise<void> {
    const startTime = this.stepStartTimes.get(runId);
    const endTime = nowIso();

    await this.emit({
      name: 'chain',
      type: 'agent',
      status: 'ok',
      startedAt: startTime,
      endedAt: endTime,
      output: outputs,
    });

    this.stepStartTimes.delete(runId);
  }

  async handleChainError(err: Error, runId: string): Promise<void> {
    const startTime = this.stepStartTimes.get(runId);
    const endTime = nowIso();

    await this.emit({
      name: 'chain',
      type: 'agent',
      status: 'error',
      startedAt: startTime,
      endedAt: endTime,
      error: { message: err.message },
    });

    this.stepStartTimes.delete(runId);
  }
}

/**
 * Creates a callback handler that emits RunStep events.
 */
export function createRunStepCallback(
  onStep?: OnStepCallback,
  runId?: string
): RunStepCallbackHandler {
  return new RunStepCallbackHandler({ onStep, runId });
}
