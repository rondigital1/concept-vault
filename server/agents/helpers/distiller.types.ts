/**
 * Types for the Distiller agent.
 */
import { Annotation } from '@langchain/langgraph';
import { DocumentRow } from '@/server/repos/distiller.repo';

// ---------- Input/Output Types ----------

export interface DistillerInput {
  day: string;
  documentIds?: string[];
  limit?: number;
  topicTag?: string;
}

export interface DistillerOutput {
  runId?: string;
  artifactIds: string[];
  counts: {
    docsProcessed: number;
    conceptsProposed: number;
    flashcardsProposed: number;
  };
}

export interface ExtractedConcept {
  label: string;
  type: 'definition' | 'principle' | 'framework' | 'procedure' | 'fact';
  summary: string;
  evidence: Array<{ quote: string; location?: { startChar: number; endChar: number } }>;
}

export interface GeneratedFlashcard {
  format: 'qa' | 'cloze';
  front: string;
  back: string;
  conceptLabel?: string;
}

export interface DocumentWithConcepts {
  doc: DocumentRow;
  concepts: ExtractedConcept[];
  conceptIdMap: Map<string, string>;
}

// ---------- State ----------

export const DistillerState = Annotation.Root({
  // Input
  day: Annotation<string>,
  documentIds: Annotation<string[] | undefined>,
  limit: Annotation<number>,
  topicTag: Annotation<string | undefined>,
  runId: Annotation<string | undefined>,
  // Working state
  documents: Annotation<DocumentRow[]>,
  currentDocIndex: Annotation<number>,
  processedDocs: Annotation<DocumentWithConcepts[]>,
  allFlashcards: Annotation<Array<GeneratedFlashcard & { documentId: string; conceptId: string | null }>>,
  // Output
  artifactIds: Annotation<string[]>,
  counts: Annotation<{
    docsProcessed: number;
    conceptsProposed: number;
    flashcardsProposed: number;
  }>,
  error: Annotation<string | null>,
});

export type DistillerStateType = typeof DistillerState.State;
