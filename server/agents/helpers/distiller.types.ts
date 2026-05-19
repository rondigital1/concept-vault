/**
 * Types for the Distiller agent.
 */
import { Annotation } from '@langchain/langgraph';
import { DocumentRow } from '@/server/repos/distiller.repo';

// ---------- Input/Output Types ----------

export interface DistillerInput {
  workspaceId: string;
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
  errors: DistillerError[];
}

export type DistillerErrorStage =
  | 'extractConcepts'
  | 'saveConcepts'
  | 'generateFlashcards'
  | 'saveFlashcards';

export interface DistillerError {
  stage: DistillerErrorStage;
  documentId: string;
  message: string;
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
  workspaceId: Annotation<string>,
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
  errors: Annotation<DistillerError[]>,
});

export type DistillerStateType = typeof DistillerState.State;
