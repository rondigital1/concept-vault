/**
 * Types for the WebScout agent.
 */
import { Annotation } from '@langchain/langgraph';
import { TavilySearchResult } from '@/server/tools/tavily.tool';
import { DocumentRow } from '@/server/repos/webScout.repo';

// ---------- Input/Output Types ----------

export interface WebScoutInput {
  mode: 'explicit-query' | 'derive-from-vault';
  query?: string;
  deriveLimit?: number;
  focusTags?: string[];
  maxResults?: number;
  minRelevanceScore?: number;
  day: string;
}

export interface WebScoutOutput {
  proposals: WebScoutProposal[];
  artifactIds: string[];
  counts: {
    queriesExecuted: number;
    urlsFetched: number;
    urlsFiltered: number;
    proposalsCreated: number;
  };
  queriesUsed: string[];
}

export interface WebScoutProposal {
  url: string;
  title: string;
  summary: string;
  relevanceReason: string;
  relevanceScore: number;
  contentType: 'article' | 'documentation' | 'paper' | 'tutorial' | 'video' | 'other';
  topics: string[];
  sourceQuery: string;
  excerpt?: string;
}

export interface ScoredResult extends TavilySearchResult {
  relevanceScore: number;
  relevanceReason: string;
  contentType: WebScoutProposal['contentType'];
  topics: string[];
  sourceQuery: string;
}

// ---------- State ----------

export const WebScoutState = Annotation.Root({
  // Input
  mode: Annotation<'explicit-query' | 'derive-from-vault'>,
  explicitQuery: Annotation<string | undefined>,
  deriveLimit: Annotation<number>,
  focusTags: Annotation<string[] | undefined>,
  maxResults: Annotation<number>,
  minRelevanceScore: Annotation<number>,
  day: Annotation<string>,
  runId: Annotation<string | undefined>,
  // Working state
  vaultDocuments: Annotation<DocumentRow[]>,
  queries: Annotation<string[]>,
  allResults: Annotation<Array<TavilySearchResult & { sourceQuery: string }>>,
  dedupedResults: Annotation<Array<TavilySearchResult & { sourceQuery: string }>>,
  scoredResults: Annotation<ScoredResult[]>,
  // Output
  proposals: Annotation<WebScoutProposal[]>,
  artifactIds: Annotation<string[]>,
  counts: Annotation<{
    queriesExecuted: number;
    urlsFetched: number;
    urlsFiltered: number;
    proposalsCreated: number;
  }>,
  queriesUsed: Annotation<string[]>,
  error: Annotation<string | null>,
});

export type WebScoutStateType = typeof WebScoutState.State;
