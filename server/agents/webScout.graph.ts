/**
 * WebScout Agent using LangGraph.
 *
 * Responsibilities:
 * - Derive search queries from vault documents (or use explicit query)
 * - Execute web searches via Tavily
 * - Score and filter results for relevance
 * - Create proposal artifacts for user review
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
import {
  prepareQueries,
  executeSearches,
  deduplicateUrls,
  scoreResults,
  createProposals,
} from './helpers/webScout.nodes';

// Re-export types for external consumers
export type { WebScoutInput, WebScoutOutput, WebScoutProposal } from './helpers/webScout.types';

// ---------- Conditional edges ----------

function shouldContinueAfterQueries(state: WebScoutStateType): string {
  if (state.error || state.queries.length === 0) {
    return END;
  }
  return 'executeSearches';
}

function shouldContinueAfterSearch(state: WebScoutStateType): string {
  if (state.allResults.length === 0) {
    return END;
  }
  return 'deduplicateUrls';
}

function shouldContinueAfterDedup(state: WebScoutStateType): string {
  if (state.dedupedResults.length === 0) {
    return END;
  }
  return 'scoreResults';
}

function shouldContinueAfterScore(state: WebScoutStateType): string {
  if (state.scoredResults.length === 0) {
    return END;
  }
  return 'createProposals';
}

// ---------- Graph ----------

function createWebScoutGraph() {
  const workflow = new StateGraph(WebScoutState)
    .addNode('prepareQueries', prepareQueries)
    .addNode('executeSearches', executeSearches)
    .addNode('deduplicateUrls', deduplicateUrls)
    .addNode('scoreResults', scoreResults)
    .addNode('createProposals', createProposals)
    .addEdge('__start__', 'prepareQueries')
    .addConditionalEdges('prepareQueries', shouldContinueAfterQueries, {
      executeSearches: 'executeSearches',
      [END]: END,
    })
    .addConditionalEdges('executeSearches', shouldContinueAfterSearch, {
      deduplicateUrls: 'deduplicateUrls',
      [END]: END,
    })
    .addConditionalEdges('deduplicateUrls', shouldContinueAfterDedup, {
      scoreResults: 'scoreResults',
      [END]: END,
    })
    .addConditionalEdges('scoreResults', shouldContinueAfterScore, {
      createProposals: 'createProposals',
      [END]: END,
    })
    .addEdge('createProposals', END);

  return workflow.compile();
}

// ---------- Export ----------

/**
 * WebScout Agent using LangGraph.
 */
export async function webScoutGraph(
  input: WebScoutInput,
  onStep?: (step: RunStep) => void,
  runId?: string
): Promise<WebScoutOutput> {
  const graph = createWebScoutGraph();

  // Emit start step
  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'webscout_start',
      status: 'running',
      startedAt: new Date().toISOString(),
      input: {
        mode: input.mode,
        query: input.query,
        focusTags: input.focusTags,
      },
    });
  }

  const callbacks = onStep ? [createRunStepCallback(onStep)] : [];

  const result = await graph.invoke(
    {
      mode: input.mode,
      explicitQuery: input.query,
      deriveLimit: input.deriveLimit ?? 5,
      focusTags: input.focusTags,
      maxResults: Math.min(input.maxResults ?? 10, 20),
      minRelevanceScore: input.minRelevanceScore ?? 0.6,
      day: input.day,
      runId,
      vaultDocuments: [],
      queries: [],
      allResults: [],
      dedupedResults: [],
      scoredResults: [],
      proposals: [],
      artifactIds: [],
      counts: { queriesExecuted: 0, urlsFetched: 0, urlsFiltered: 0, proposalsCreated: 0 },
      queriesUsed: [],
      error: null,
    },
    { callbacks }
  );

  // Emit completion step
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
    counts: result.counts,
    queriesUsed: result.queriesUsed,
  };
}
