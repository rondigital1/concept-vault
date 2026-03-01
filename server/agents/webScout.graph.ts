/**
 * WebScout ReAct Agent using LangGraph.
 *
 * Graph topology:
 *   __start__ → setup → agent ⟷ executeTools → finalize → __end__
 *
 * The agent iteratively searches, evaluates, and refines queries
 * until a quality threshold is met or limits are reached.
 */
import { StateGraph, END } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
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

function routeAfterAgent(state: WebScoutStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const hasToolCalls = lastMessage instanceof AIMessage && (lastMessage.tool_calls?.length ?? 0) > 0;

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

  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'webscout_start',
      status: 'running',
      startedAt: new Date().toISOString(),
      input: { mode: input.mode, goal: input.goal, focusTags: input.focusTags },
    });
  }

  const callbacks = onStep ? [createRunStepCallback(onStep)] : [];

  const result = await graph.invoke(
    {
      goal: input.goal,
      mode: input.mode,
      day: input.day,
      focusTags: input.focusTags,
      minQualityResults: input.minQualityResults ?? 3,
      minRelevanceScore: input.minRelevanceScore ?? 0.8,
      maxIterations: input.maxIterations ?? 5,
      maxQueries: input.maxQueries ?? 10,
      runId,
      importToLibrary: input.importToLibrary ?? false,
      restrictToWatchlistDomains: input.restrictToWatchlistDomains ?? false,
      // Working state defaults
      messages: [],
      iteration: 0,
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
        documentsImported: 0,
        documentsSkipped: 0,
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
