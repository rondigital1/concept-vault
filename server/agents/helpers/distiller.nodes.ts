/**
 * Node implementations for the Distiller agent.
 */
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createExtractionModel, createGenerationModel } from '@/server/langchain/models';
import { ConceptExtractionSchema, FlashcardGenerationSchema } from '@/server/langchain/schemas';
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

  const model = createExtractionModel({ temperature: 0.3 }).withStructuredOutput(
    ConceptExtractionSchema
  );

  try {
    const result = await model.invoke([
      new SystemMessage(`You are extracting key concepts from a document for a knowledge management system.

Extract 2-5 key concepts. For each concept, identify:
- label: A short name (2-5 words)
- type: One of: definition, principle, framework, procedure, fact
- summary: A 1-2 sentence explanation
- evidence: 1-2 direct quotes from the text

IMPORTANT:
- Only extract concepts directly supported by the text
- Quotes must be exact matches from the document
- Keep summaries concise and actionable`),
      new HumanMessage(`DOCUMENT TITLE: "${doc.title}"
DOCUMENT CONTENT:
${truncatedContent}`),
    ]);

    const concepts: ExtractedConcept[] = result.concepts.map((c: { label: string; type: ExtractedConcept['type']; summary: string; evidence: ExtractedConcept['evidence'] }) => ({
      label: c.label.slice(0, 100),
      type: c.type,
      summary: c.summary.slice(0, 500),
      evidence: c.evidence.slice(0, 3),
    }));

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

  const model = createGenerationModel({ temperature: 0.4 }).withStructuredOutput(
    FlashcardGenerationSchema
  );

  try {
    const result = await model.invoke([
      new SystemMessage(`You are generating flashcards for spaced repetition learning.

Generate 1-2 flashcards per concept. Mix formats:
- "qa": Question on front, answer on back
- "cloze": Statement with {{cloze deletion}} on front, full statement on back

IMPORTANT:
- Keep questions clear and specific
- Answers should be concise but complete
- For cloze, use {{double braces}} for deletions`),
      new HumanMessage(`DOCUMENT: "${doc.title}"
CONCEPTS:
${conceptsText}`),
    ]);

    const flashcards = result.flashcards.map((f: { format: 'qa' | 'cloze'; front: string; back: string; conceptLabel?: string }) => ({
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
