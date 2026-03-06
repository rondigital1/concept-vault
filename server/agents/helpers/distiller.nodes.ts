/**
 * Node implementations for the Distiller agent.
 */
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { ConceptExtractionSchema } from '@/server/langchain/schemas/concept.schema';
import { FlashcardGenerationSchema } from '@/server/langchain/schemas/flashcard.schema';
import {
  DocumentRow,
  ConceptInput,
  FlashcardInput,
  getDocumentsByIds,
  getDocumentsByTag,
  getRecentDocuments,
  insertConcept,
  insertFlashcard,
  insertArtifact,
} from '@/server/repos/distiller.repo';
import {
  ExtractedConcept,
  DistillerStateType,
} from './distiller.types';

export async function fetchDocuments(state: DistillerStateType): Promise<Partial<DistillerStateType>> {
  const limit = state.limit ?? 5;

  let documents: DocumentRow[];

  if (state.documentIds && state.documentIds.length > 0) {
    documents = await getDocumentsByIds(state.documentIds, limit);
  } else if (state.topicTag) {
    documents = await getDocumentsByTag(state.topicTag, limit);
  } else {
    documents = await getRecentDocuments(limit);
  }

  return {
    documents,
    currentDocIndex: 0,
    processedDocs: [],
    allFlashcards: [],
    artifactIds: [],
    counts: { docsProcessed: 0, conceptsProposed: 0, flashcardsProposed: 0 },
  };
}

export async function extractConcepts(state: DistillerStateType): Promise<Partial<DistillerStateType>> {
  const doc = state.documents[state.currentDocIndex];
  if (!doc) {
    return {};
  }

  const truncatedContent = doc.content.slice(0, 4000);

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.distillDocument,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You extract key concepts from a document for a knowledge management system.',
        },
        {
          heading: 'Requirements',
          content: [
            'Extract 2-5 concepts.',
            'Each concept needs a label, type, summary, and direct supporting quotes.',
            'Only extract concepts directly supported by the text.',
            'Quotes must match the source exactly.',
            'Keep summaries concise and actionable.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Document Title',
          content: doc.title,
        },
        {
          heading: 'Document Content',
          content: truncatedContent,
        },
      ],
    });
    const result = await openAIExecutionService.executeStructured({
      task: AI_TASKS.distillDocument,
      prompt,
      schema: ConceptExtractionSchema,
      schemaName: 'distilled_concepts',
      allowEscalationOnValidationFailure: true,
      attribution: {
        jobId: state.runId,
      },
    });

    const concepts: ExtractedConcept[] = result.output.concepts.map((c) => ({
      label: c.label.slice(0, 100),
      type: c.type,
      summary: c.summary.slice(0, 500),
      evidence: c.evidence.slice(0, 3),
    })) as ExtractedConcept[];

    return {
      processedDocs: [
        ...state.processedDocs,
        { doc, concepts, conceptIdMap: new Map() },
      ],
    };
  } catch {
    return {
      processedDocs: [
        ...state.processedDocs,
        { doc, concepts: [], conceptIdMap: new Map() },
      ],
    };
  }
}

export async function saveConcepts(state: DistillerStateType): Promise<Partial<DistillerStateType>> {
  const currentProcessed = state.processedDocs[state.currentDocIndex];
  if (!currentProcessed || currentProcessed.concepts.length === 0) {
    return {};
  }

  const { doc, concepts } = currentProcessed;
  const conceptIdMap = new Map<string, string>();
  const newArtifactIds: string[] = [];
  let conceptsProposed = 0;

  for (const concept of concepts) {
    try {
      const conceptInput: ConceptInput = {
        label: concept.label,
        type: concept.type,
        summary: concept.summary,
        evidence: concept.evidence,
      };
      const conceptId = await insertConcept(doc.id, conceptInput);
      conceptIdMap.set(concept.label, conceptId);
      conceptsProposed++;

      const artifactId = await insertArtifact({
        runId: state.runId ?? null,
        agent: 'distiller',
        kind: 'concept',
        day: state.day,
        title: concept.label,
        content: {
          type: concept.type,
          summary: concept.summary,
          evidence: concept.evidence,
          documentTitle: doc.title,
        },
        sourceRefs: { documentId: doc.id, conceptId },
      });
      newArtifactIds.push(artifactId);
    } catch {
      // Continue on error
    }
  }

  // Update the conceptIdMap in processedDocs
  const updatedProcessedDocs = [...state.processedDocs];
  updatedProcessedDocs[state.currentDocIndex] = {
    ...currentProcessed,
    conceptIdMap,
  };

  return {
    processedDocs: updatedProcessedDocs,
    artifactIds: [...state.artifactIds, ...newArtifactIds],
    counts: {
      ...state.counts,
      conceptsProposed: state.counts.conceptsProposed + conceptsProposed,
    },
  };
}

export async function generateFlashcards(state: DistillerStateType): Promise<Partial<DistillerStateType>> {
  const currentProcessed = state.processedDocs[state.currentDocIndex];
  if (!currentProcessed || currentProcessed.concepts.length === 0) {
    return {};
  }

  const { doc, concepts } = currentProcessed;

  const conceptsText = concepts
    .map((c, i) => `${i + 1}. ${c.label} (${c.type}): ${c.summary}`)
    .join('\n');

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.generateFlashcards,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You generate flashcards for spaced repetition learning.',
        },
        {
          heading: 'Requirements',
          content: [
            'Generate 1-2 flashcards per concept.',
            'Mix qa and cloze formats when useful.',
            'Keep questions clear and specific.',
            'Keep answers concise but complete.',
            'Use double braces for cloze deletions.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Document',
          content: doc.title,
        },
        {
          heading: 'Concepts',
          content: conceptsText,
        },
      ],
    });
    const result = await openAIExecutionService.executeStructured({
      task: AI_TASKS.generateFlashcards,
      prompt,
      schema: FlashcardGenerationSchema,
      schemaName: 'generated_flashcards',
      attribution: {
        jobId: state.runId,
      },
    });

    const flashcards = result.output.flashcards.map((f) => ({
      format: f.format,
      front: f.front.slice(0, 1000),
      back: f.back.slice(0, 2000),
      conceptLabel: f.conceptLabel,
      documentId: doc.id,
      conceptId: currentProcessed.conceptIdMap.get(f.conceptLabel ?? '') ?? null,
    }));

    return {
      allFlashcards: [...state.allFlashcards, ...flashcards],
    };
  } catch {
    return {};
  }
}

export async function saveFlashcards(state: DistillerStateType): Promise<Partial<DistillerStateType>> {
  const currentProcessed = state.processedDocs[state.currentDocIndex];
  if (!currentProcessed) {
    return {};
  }

  const { doc } = currentProcessed;
  const docFlashcards = state.allFlashcards.filter((f) => f.documentId === doc.id);

  const newArtifactIds: string[] = [];
  let flashcardsProposed = 0;

  for (const flashcard of docFlashcards) {
    try {
      const flashcardInput: FlashcardInput = {
        format: flashcard.format,
        front: flashcard.front,
        back: flashcard.back,
      };
      const flashcardId = await insertFlashcard(doc.id, flashcard.conceptId, flashcardInput);
      flashcardsProposed++;

      const artifactId = await insertArtifact({
        runId: state.runId ?? null,
        agent: 'distiller',
        kind: 'flashcard',
        day: state.day,
        title: `Flashcard: ${flashcard.front.slice(0, 50)}...`,
        content: {
          format: flashcard.format,
          front: flashcard.front,
          back: flashcard.back,
          documentTitle: doc.title,
        },
        sourceRefs: { documentId: doc.id, flashcardId, conceptId: flashcard.conceptId },
      });
      newArtifactIds.push(artifactId);
    } catch {
      // Continue on error
    }
  }

  return {
    artifactIds: [...state.artifactIds, ...newArtifactIds],
    counts: {
      ...state.counts,
      docsProcessed: state.counts.docsProcessed + 1,
      flashcardsProposed: state.counts.flashcardsProposed + flashcardsProposed,
    },
    currentDocIndex: state.currentDocIndex + 1,
  };
}
