/**
 * Distiller Agent using LangGraph.
 *
 * Responsibilities:
 * - Fetch documents (by IDs, by tag, or recent)
 * - Extract key concepts using structured output
 * - Generate flashcards from concepts
 * - Save concepts and flashcards to database
 * - Create artifacts for review inbox
 */
import { StateGraph, END } from '@langchain/langgraph';
import { createRunStepCallback } from '@/server/langchain/callbacks/runStepAdapter';
import { RunStep } from '@/server/observability/runTrace.types';
import {
  DistillerInput,
  DistillerOutput,
  DistillerState,
  DistillerStateType,
} from './helpers/distiller.types';
import {
  fetchDocuments,
  extractConcepts,
  saveConcepts,
  generateFlashcards,
  saveFlashcards,
} from './helpers/distiller.nodes';

// Re-export types for external consumers
export type { DistillerInput, DistillerOutput } from './helpers/distiller.types';

// ---------- Conditional edges ----------

function shouldProcessNextDocument(state: DistillerStateType): string {
  if (state.documents.length === 0) {
    return END;
  }
  if (state.currentDocIndex < state.documents.length) {
    return 'extractConcepts';
  }
  return END;
}

// ---------- Graph ----------

function createDistillerGraph() {
  const workflow = new StateGraph(DistillerState)
    .addNode('fetchDocuments', fetchDocuments)
    .addNode('extractConcepts', extractConcepts)
    .addNode('saveConcepts', saveConcepts)
    .addNode('generateFlashcards', generateFlashcards)
    .addNode('saveFlashcards', saveFlashcards)
    .addEdge('__start__', 'fetchDocuments')
    .addConditionalEdges('fetchDocuments', shouldProcessNextDocument, {
      extractConcepts: 'extractConcepts',
      [END]: END,
    })
    .addEdge('extractConcepts', 'saveConcepts')
    .addEdge('saveConcepts', 'generateFlashcards')
    .addEdge('generateFlashcards', 'saveFlashcards')
    .addConditionalEdges('saveFlashcards', shouldProcessNextDocument, {
      extractConcepts: 'extractConcepts',
      [END]: END,
    });

  return workflow.compile();
}

// ---------- Export ----------

/**
 * Distiller Agent using LangGraph.
 */
export async function distillerGraph(
  input: DistillerInput,
  onStep?: (step: RunStep) => void,
  runId?: string
): Promise<DistillerOutput> {
  const graph = createDistillerGraph();

  // Emit start step
  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'distiller_start',
      status: 'running',
      startedAt: new Date().toISOString(),
      input: {
        day: input.day,
        documentIds: input.documentIds,
        limit: input.limit,
        topicTag: input.topicTag,
      },
    });
  }

  const callbacks = onStep ? [createRunStepCallback(onStep)] : [];

  const result = await graph.invoke(
    {
      day: input.day,
      documentIds: input.documentIds,
      limit: input.limit ?? 5,
      topicTag: input.topicTag,
      runId,
      documents: [],
      currentDocIndex: 0,
      processedDocs: [],
      allFlashcards: [],
      artifactIds: [],
      counts: { docsProcessed: 0, conceptsProposed: 0, flashcardsProposed: 0 },
      error: null,
    },
    { callbacks }
  );

  // Emit completion step
  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'distiller_complete',
      status: 'ok',
      endedAt: new Date().toISOString(),
      output: result.counts,
    });
  }

  return {
    runId,
    artifactIds: result.artifactIds,
    counts: result.counts,
  };
}
