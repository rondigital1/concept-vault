/**
 * WebScout ReAct Agent using LangGraph.
 *
 * Graph topology:
 *   __start__ -> setup -> agent <-> executeTools -> finalize -> __end__
 *
 * The agent iteratively searches, evaluates, and refines queries
 * until a quality threshold is met or limits are reached.
 */
import { StateGraph, END } from '@langchain/langgraph';
import { createRunStepCallback } from '@/server/langchain/callbacks/runStepAdapter';
import { RunStep } from '@/server/observability/runTrace.types';
import {
  WebScoutInput,
  WebScoutOutput,
  WebScoutState,
  WebScoutStateType,
} from './helpers/webScout.types';
import { setup, agent, executeTools, finalize } from './helpers/webScout.nodes';

export type { WebScoutInput, WebScoutOutput, WebScoutProposal } from './helpers/webScout.types';

// ---------- Routing ----------

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(Math.floor(value), max));
}

function clampScore(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(value, 1));
}

function routeAfterAgent(state: WebScoutStateType): string {
  const hasToolCalls = (state.lastAgentResult?.toolCalls.length ?? 0) > 0;

  if (!hasToolCalls) {
    return 'finalize';
  }

  if (state.queriesExecuted >= state.maxQueries) {
    return 'finalize';
  }
  if (state.iteration >= state.maxIterations) {
    return 'finalize';
  }

  return 'executeTools';
}

// ---------- Graph ----------

function createWebScoutGraph() {
  const workflow = new StateGraph(WebScoutState)
    .addNode('setup', setup)
    .addNode('agent', agent)
    .addNode('executeTools', executeTools)
    .addNode('finalize', finalize)
    .addEdge('__start__', 'setup')
    .addEdge('setup', 'agent')
    .addConditionalEdges('agent', routeAfterAgent, {
      executeTools: 'executeTools',
      finalize: 'finalize',
    })
    .addEdge('executeTools', 'agent')
    .addEdge('finalize', END);

  return workflow.compile();
}

// ---------- Export ----------

export async function webScoutGraph(
  input: WebScoutInput,
  onStep?: (step: RunStep) => void,
  runId?: string,
): Promise<WebScoutOutput> {
  const graph = createWebScoutGraph();
  const goal = input.goal.trim().slice(0, 500);
  const focusTags = Array.isArray(input.focusTags) ? input.focusTags.slice(0, 20) : undefined;
  const minQualityResults = clampInt(input.minQualityResults, 3, 1, 10);
  const minRelevanceScore = clampScore(input.minRelevanceScore, 0.8);
  const maxIterations = clampInt(input.maxIterations, 5, 1, 10);
  const maxQueries = clampInt(input.maxQueries, 10, 1, 25);

  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'webscout_start',
      status: 'running',
      startedAt: new Date().toISOString(),
      input: { mode: input.mode, goal, focusTags },
    });
  }

  const callbacks = onStep ? [createRunStepCallback(onStep)] : [];

  const result = await graph.invoke(
    {
      goal,
      mode: input.mode,
      day: input.day,
      focusTags,
      minQualityResults,
      minRelevanceScore,
      maxIterations,
      maxQueries,
      runId,
      restrictToWatchlistDomains: input.restrictToWatchlistDomains ?? false,
      // Working state defaults
      initialInput: [],
      instructions: '',
      iteration: 0,
      lastAgentResult: null,
      pendingToolOutputs: [],
      previousResponseId: null,
      promptCacheKey: '',
      queriesExecuted: 0,
      qualityResults: [],
      vaultContext: '',
      watchSourceDomains: [],
      // Output defaults
      proposals: [],
      artifactIds: [],
      reasoning: [],
      terminationReason: null,
      counts: {
        iterations: 0,
        queriesExecuted: 0,
        resultsEvaluated: 0,
        proposalsCreated: 0,
      },
      error: null,
    },
    { callbacks },
  );

  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'webscout_complete',
      status: result.error ? 'error' : 'ok',
      endedAt: new Date().toISOString(),
      output: result.counts,
      error: result.error ? { message: result.error } : undefined,
    });
  }

  return {
    proposals: result.proposals,
    artifactIds: result.artifactIds,
    reasoning: result.reasoning,
    terminationReason: result.terminationReason,
    counts: result.counts,
  };
}
