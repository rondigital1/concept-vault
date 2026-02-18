/**
 * Types for the WebScout ReAct agent.
 */
import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

// ---------- Enums / Literals ----------

export type ContentType = 'article' | 'documentation' | 'paper' | 'tutorial' | 'video' | 'other';
export type TerminationReason = 'satisfied' | 'max_iterations' | 'max_queries' | null;

// ---------- Input/Output Types ----------

export interface WebScoutInput {
  goal: string;
  mode: 'explicit-query' | 'derive-from-vault';
  day: string;
  focusTags?: string[];
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
}

export interface WebScoutCounts {
  iterations: number;
  queriesExecuted: number;
  resultsEvaluated: number;
  proposalsCreated: number;
}

export interface WebScoutOutput {
  proposals: WebScoutProposal[];
  artifactIds: string[];
  reasoning: string[];
  terminationReason: TerminationReason;
  counts: WebScoutCounts;
}

export interface WebScoutProposal {
  url: string;
  title: string;
  summary: string;
  relevanceScore: number;
  contentType: ContentType;
  topics: string[];
  reasoning: string[];
}

export interface ScoredResult {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  contentType: ContentType;
  topics: string[];
  reasoning: string[];
}

// ---------- State ----------

export const WebScoutState = Annotation.Root({
  // Inputs
  goal: Annotation<string>,
  mode: Annotation<'explicit-query' | 'derive-from-vault'>,
  day: Annotation<string>,
  focusTags: Annotation<string[] | undefined>,
  minQualityResults: Annotation<number>,
  minRelevanceScore: Annotation<number>,
  maxIterations: Annotation<number>,
  maxQueries: Annotation<number>,
  runId: Annotation<string | undefined>,

  // ReAct working state
  messages: Annotation<BaseMessage[]>,
  iteration: Annotation<number>,
  queriesExecuted: Annotation<number>,
  qualityResults: Annotation<ScoredResult[]>,
  vaultContext: Annotation<string>,
  watchSourceDomains: Annotation<string[]>,

  // Outputs
  proposals: Annotation<WebScoutProposal[]>,
  artifactIds: Annotation<string[]>,
  reasoning: Annotation<string[]>,
  terminationReason: Annotation<TerminationReason>,
  counts: Annotation<WebScoutCounts>,
  error: Annotation<string | null>,
});

export type WebScoutStateType = typeof WebScoutState.State;
