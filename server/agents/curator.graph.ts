/**
 * Curator Agent using LangGraph.
 *
 * Responsibilities:
 * - Load a document
 * - Extract tags using structured output
 * - Optionally categorize (LLM)
 * - Find related documents (deterministic)
 * - Persist tags
 */
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createExtractionModel } from '@/server/langchain/models';
import { CategorizationSchema, TagExtractionSchema } from '@/server/langchain/schemas/tags.schema';
import { createRunStepCallback } from '@/server/langchain/callbacks/runStepAdapter';
import { RunStep } from '@/server/observability/runTrace.types';
import {
  getDocument,
  findRelatedDocs,
  setDocumentTags,
  DocumentRow,
} from '@/server/services/document.service';
import { finalizeTags } from './helpers/tags';

// ---------- Types ----------

export interface CuratorInput {
  documentId: string;
  enableCategorization?: boolean;
}

export interface CuratorOutput {
  tags: string[];
  category: string;
  relatedDocs: string[];
}

// ---------- State ----------

const CuratorState = Annotation.Root({
  // Input
  documentId: Annotation<string>,
  enableCategorization: Annotation<boolean>,
  // Working state
  document: Annotation<DocumentRow | null>,
  rawTags: Annotation<string[]>,
  tags: Annotation<string[]>,
  category: Annotation<string>,
  relatedDocs: Annotation<string[]>,
  // Output
  error: Annotation<string | null>,
});

type CuratorStateType = typeof CuratorState.State;

// ---------- Nodes ----------

async function loadDocument(state: CuratorStateType): Promise<Partial<CuratorStateType>> {
  const document = await getDocument(state.documentId);

  if (!document) {
    return { document: null, error: `Document ${state.documentId} not found` };
  }

  return { document, error: null };
}

async function extractTags(state: CuratorStateType): Promise<Partial<CuratorStateType>> {
  if (!state.document) {
    return { rawTags: [], tags: [] };
  }

  const content = state.document.content.slice(0, 12_000);

  const model = createExtractionModel({ temperature: 0.3 }).withStructuredOutput(
    TagExtractionSchema
  );

  const result = await model.invoke([
    new SystemMessage(`You are extracting topic tags from a document.

RULES (STRICT)
- Maximum 10 tags
- Each tag must be: lowercase, 1-3 words, a noun or noun phrase
- No punctuation, no explanations, no duplicates
- No generic words like: introduction, overview, guide, article, notes, example, basics, concepts
- Prefer concrete, commonly-used terms

GOOD EXAMPLES: spaced repetition, retrieval practice, learning science, distributed systems
BAD EXAMPLES: how to learn better, interesting ideas, modern technology`),
    new HumanMessage(`Extract topic tags from this document:\n\n${content}`),
  ]);

  const rawTags = result.tags;
  const tags = finalizeTags(rawTags);

  return { rawTags, tags };
}

async function categorizeDocument(state: CuratorStateType): Promise<Partial<CuratorStateType>> {
  if (!state.enableCategorization || state.tags.length === 0) {
    return { category: 'uncategorized' };
  }

  const model = createExtractionModel({ temperature: 0.2 }).withStructuredOutput(
    CategorizationSchema
  );

  try {
    const result = await model.invoke([
      new SystemMessage(`Choose exactly ONE category for the given tags.
Allowed categories: learning, software engineering, ai systems, finance, productivity, other`),
      new HumanMessage(`Tags: ${state.tags.join(', ')}`),
    ]);

    return { category: result.category };
  } catch {
    return { category: 'uncategorized' };
  }
}

async function findRelated(state: CuratorStateType): Promise<Partial<CuratorStateType>> {
  if (!state.document) {
    return { relatedDocs: [] };
  }

  const relatedDocs = await findRelatedDocs(state.document.id);
  return { relatedDocs };
}

async function persistTags(state: CuratorStateType): Promise<Partial<CuratorStateType>> {
  if (!state.document || state.tags.length === 0) {
    return {};
  }

  await setDocumentTags(state.document.id, state.tags);
  return {};
}

// ---------- Conditional edges ----------

function shouldContinueAfterLoad(state: CuratorStateType): string {
  return state.error ? END : 'extractTags';
}

// ---------- Graph ----------

function createCuratorGraph() {
  const workflow = new StateGraph(CuratorState)
    .addNode('loadDocument', loadDocument)
    .addNode('extractTags', extractTags)
    .addNode('categorize', categorizeDocument)
    .addNode('findRelated', findRelated)
    .addNode('persistTags', persistTags)
    .addEdge('__start__', 'loadDocument')
    .addConditionalEdges('loadDocument', shouldContinueAfterLoad, {
      extractTags: 'extractTags',
      [END]: END,
    })
    .addEdge('extractTags', 'categorize')
    .addEdge('categorize', 'findRelated')
    .addEdge('findRelated', 'persistTags')
    .addEdge('persistTags', END);

  return workflow.compile();
}

// ---------- Export ----------

/**
 * Curator Agent using LangGraph.
 */
export async function curatorGraph(
  input: CuratorInput,
  onStep?: (step: RunStep) => void
): Promise<CuratorOutput> {
  const graph = createCuratorGraph();

  // Emit start step
  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'curator_start',
      status: 'running',
      startedAt: new Date().toISOString(),
      input: { documentId: input.documentId },
    });
  }

  const callbacks = onStep ? [createRunStepCallback(onStep)] : [];

  const result = await graph.invoke(
    {
      documentId: input.documentId,
      enableCategorization: input.enableCategorization ?? false,
      document: null,
      rawTags: [],
      tags: [],
      category: 'uncategorized',
      relatedDocs: [],
      error: null,
    },
    { callbacks }
  );

  // Emit completion step
  if (onStep) {
    onStep({
      timestamp: new Date().toISOString(),
      type: 'agent',
      name: 'curator_complete',
      status: result.error ? 'error' : 'ok',
      endedAt: new Date().toISOString(),
      output: {
        tags: result.tags,
        category: result.category,
        relatedDocs: result.relatedDocs,
      },
      error: result.error ? { message: result.error } : undefined,
    });
  }

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    tags: result.tags,
    category: result.category,
    relatedDocs: result.relatedDocs,
  };
}
