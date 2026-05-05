/**
 * Distiller Agent Tests
 * 
 * Tests the Distiller agent pipeline with mocked LLM.
 * Verifies:
 * - Concepts are extracted from documents
 * - Flashcards are generated from concepts
 * - Artifacts are created with correct structure
 * - Counts are tracked correctly
 * 
 * Uses: Mocked LLM, Real Postgres
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
  getTestWorkspaceScope,
  insertTestDocument,
} from '../helpers/testDb';
import { MOCK_LLM_RESPONSES } from '../helpers/mocks';
import { TEST_DAY, SAMPLE_DOCUMENTS } from '../helpers/fixtures';
import { listInboxArtifacts, listArtifactsByAgentAndKind } from '@/server/repos/artifacts.repo';
import { AI_BUDGETS } from '@/server/ai/budget-policy';
import { AI_TASKS } from '@/server/ai/tasks';

const mockExecuteStructured = vi.hoisted(() => vi.fn());

vi.mock('@/server/ai/openai-execution-service', () => ({
  openAIExecutionService: {
    executeStructured: mockExecuteStructured,
    executeText: vi.fn(),
    executeToolRound: vi.fn(),
  },
}));

describe('Distiller Agent', () => {
  let scope: { workspaceId: string };

  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    scope = await getTestWorkspaceScope();
    vi.clearAllMocks();
    mockExecuteStructured.mockImplementation(async ({ task }: { task: string }) => {
      if (task === AI_TASKS.distillDocument) {
        return {
          output: MOCK_LLM_RESPONSES.conceptExtraction,
        };
      }

      if (task === AI_TASKS.generateFlashcards) {
        return {
          output: MOCK_LLM_RESPONSES.flashcardGeneration,
        };
      }

      throw new Error(`Unexpected task ${task}`);
    });
  });

  describe('basic pipeline', () => {
    it('passes explicit AI budgets to concept and flashcard generation', async () => {
      const docId = await insertTestDocument({
        title: SAMPLE_DOCUMENTS.spacedRepetition.title,
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
        tags: SAMPLE_DOCUMENTS.spacedRepetition.tags,
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [docId],
        limit: 1,
      });

      expect(mockExecuteStructured).toHaveBeenCalledWith(
        expect.objectContaining({
          task: AI_TASKS.distillDocument,
          budget: AI_BUDGETS.distillConcepts,
        }),
      );
      expect(mockExecuteStructured).toHaveBeenCalledWith(
        expect.objectContaining({
          task: AI_TASKS.generateFlashcards,
          budget: AI_BUDGETS.distillFlashcards,
        }),
      );
    });

    it('should extract concepts from a document', async () => {
      // Seed a document
      const docId = await insertTestDocument({
        title: SAMPLE_DOCUMENTS.spacedRepetition.title,
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
        tags: SAMPLE_DOCUMENTS.spacedRepetition.tags,
      });

      // Import the graph after mocks are set up
      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [docId],
        limit: 1,
      });

      // Should have processed the document
      expect(result.counts.docsProcessed).toBe(1);
      expect(result.counts.conceptsProposed).toBeGreaterThan(0);
    });

    it('should generate flashcards from concepts', async () => {
      const docId = await insertTestDocument({
        title: SAMPLE_DOCUMENTS.spacedRepetition.title,
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
        tags: SAMPLE_DOCUMENTS.spacedRepetition.tags,
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [docId],
        limit: 1,
      });

      // Should have generated flashcards
      expect(result.counts.flashcardsProposed).toBeGreaterThan(0);
    });

    it('should create artifacts for concepts and flashcards', async () => {
      const docId = await insertTestDocument({
        title: SAMPLE_DOCUMENTS.spacedRepetition.title,
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [docId],
        limit: 1,
      });

      // Check that artifact IDs were returned
      expect(result.artifactIds.length).toBeGreaterThan(0);

      // Verify artifacts in database
      const inbox = await listInboxArtifacts(scope, TEST_DAY);
      expect(inbox.length).toBeGreaterThan(0);

      // Should have both concept and flashcard artifacts
      const conceptArtifacts = inbox.filter(a => a.kind === 'concept');
      const flashcardArtifacts = inbox.filter(a => a.kind === 'flashcard');

      expect(conceptArtifacts.length).toBeGreaterThan(0);
      expect(flashcardArtifacts.length).toBeGreaterThan(0);
    });
  });

  describe('document selection', () => {
    it('should process documents by IDs', async () => {
      const doc1Id = await insertTestDocument({
        title: 'Document 1',
        content: 'Content for document 1 about learning.',
      });
      await insertTestDocument({
        title: 'Document 2',
        content: 'Content for document 2 about memory.',
      });
      const doc3Id = await insertTestDocument({
        title: 'Document 3',
        content: 'Content for document 3 about testing.',
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      // Only process doc1 and doc3
      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [doc1Id, doc3Id],
        limit: 5,
      });

      expect(result.counts.docsProcessed).toBe(2);
    });

    it('should process documents by topic tag', async () => {
      await insertTestDocument({
        title: 'Learning Doc 1',
        content: 'Content about learning.',
        tags: ['learning'],
      });
      await insertTestDocument({
        title: 'Learning Doc 2',
        content: 'More content about learning.',
        tags: ['learning'],
      });
      await insertTestDocument({
        title: 'Finance Doc',
        content: 'Content about finance.',
        tags: ['finance'],
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        topicTag: 'learning',
        limit: 5,
      });

      // Should only process the learning documents
      expect(result.counts.docsProcessed).toBe(2);
    });

    it('should process recent documents when no filter provided', async () => {
      await insertTestDocument({ title: 'Doc 1', content: 'Content 1' });
      await insertTestDocument({ title: 'Doc 2', content: 'Content 2' });
      await insertTestDocument({ title: 'Doc 3', content: 'Content 3' });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        limit: 2,
      });

      expect(result.counts.docsProcessed).toBe(2);
    });

    it('should respect limit parameter', async () => {
      await insertTestDocument({ title: 'Doc 1', content: 'Content 1' });
      await insertTestDocument({ title: 'Doc 2', content: 'Content 2' });
      await insertTestDocument({ title: 'Doc 3', content: 'Content 3' });
      await insertTestDocument({ title: 'Doc 4', content: 'Content 4' });
      await insertTestDocument({ title: 'Doc 5', content: 'Content 5' });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        limit: 3,
      });

      expect(result.counts.docsProcessed).toBe(3);
    });
  });

  describe('artifact structure', () => {
    it('should create concept artifacts with correct content', async () => {
      const docId = await insertTestDocument({
        title: 'Test Document',
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [docId],
        limit: 1,
      });

      const conceptArtifacts = await listArtifactsByAgentAndKind(scope, 'distiller', 'concept', {
        day: TEST_DAY,
        status: 'proposed',
      });

      expect(conceptArtifacts.length).toBeGreaterThan(0);

      // Check concept artifact structure
      const concept = conceptArtifacts[0];
      expect(concept.content).toHaveProperty('type');
      expect(concept.content).toHaveProperty('summary');
      expect(concept.content).toHaveProperty('evidence');
      expect(concept.content).toHaveProperty('documentTitle');
    });

    it('should create flashcard artifacts with correct content', async () => {
      const docId = await insertTestDocument({
        title: 'Test Document',
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        documentIds: [docId],
        limit: 1,
      });

      const flashcardArtifacts = await listArtifactsByAgentAndKind(scope, 'distiller', 'flashcard', {
        day: TEST_DAY,
        status: 'proposed',
      });

      expect(flashcardArtifacts.length).toBeGreaterThan(0);

      // Check flashcard artifact structure
      const flashcard = flashcardArtifacts[0];
      expect(flashcard.content).toHaveProperty('format');
      expect(flashcard.content).toHaveProperty('front');
      expect(flashcard.content).toHaveProperty('back');
      expect(flashcard.content).toHaveProperty('documentTitle');
    });
  });

  describe('empty vault handling', () => {
    it('should handle empty vault gracefully', async () => {
      // No documents in vault
      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        limit: 5,
      });

      expect(result.counts.docsProcessed).toBe(0);
      expect(result.counts.conceptsProposed).toBe(0);
      expect(result.counts.flashcardsProposed).toBe(0);
      expect(result.artifactIds).toEqual([]);
    });

    it('should handle no matching documents for tag', async () => {
      await insertTestDocument({
        title: 'Finance Doc',
        content: 'Finance content',
        tags: ['finance'],
      });

      const { distillerGraph } = await import('@/server/agents/distiller.graph');

      const result = await distillerGraph({
        workspaceId: scope.workspaceId,
        day: TEST_DAY,
        topicTag: 'nonexistent-tag',
        limit: 5,
      });

      expect(result.counts.docsProcessed).toBe(0);
    });
  });
});

describe('Distiller Golden Run Snapshot', () => {
  let scope: { workspaceId: string };

  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    scope = await getTestWorkspaceScope();
    vi.clearAllMocks();
  });

  it('should produce stable concept artifact structure', async () => {
    const docId = await insertTestDocument({
      title: SAMPLE_DOCUMENTS.spacedRepetition.title,
      content: SAMPLE_DOCUMENTS.spacedRepetition.content,
    });

    const { distillerGraph } = await import('@/server/agents/distiller.graph');

    await distillerGraph({
      workspaceId: scope.workspaceId,
      day: TEST_DAY,
      documentIds: [docId],
      limit: 1,
    });

    const conceptArtifacts = await listArtifactsByAgentAndKind(scope, 'distiller', 'concept', {
      day: TEST_DAY,
    });

    // Normalize for snapshot
    const normalizedConcepts = conceptArtifacts.map(a => ({
      agent: a.agent,
      kind: a.kind,
      day: a.day,
      status: a.status,
      contentStructure: {
        hasType: 'type' in a.content,
        hasSummary: 'summary' in a.content,
        hasEvidence: 'evidence' in a.content,
        hasDocumentTitle: 'documentTitle' in a.content,
      },
    }));

    expect(normalizedConcepts).toMatchInlineSnapshot(`
      [
        {
          "agent": "distiller",
          "contentStructure": {
            "hasDocumentTitle": true,
            "hasEvidence": true,
            "hasSummary": true,
            "hasType": true,
          },
          "day": "2025-01-15",
          "kind": "concept",
          "status": "proposed",
        },
        {
          "agent": "distiller",
          "contentStructure": {
            "hasDocumentTitle": true,
            "hasEvidence": true,
            "hasSummary": true,
            "hasType": true,
          },
          "day": "2025-01-15",
          "kind": "concept",
          "status": "proposed",
        },
      ]
    `);
  });

  it('should produce stable flashcard artifact structure', async () => {
    const docId = await insertTestDocument({
      title: SAMPLE_DOCUMENTS.spacedRepetition.title,
      content: SAMPLE_DOCUMENTS.spacedRepetition.content,
    });

    const { distillerGraph } = await import('@/server/agents/distiller.graph');

    await distillerGraph({
      workspaceId: scope.workspaceId,
      day: TEST_DAY,
      documentIds: [docId],
      limit: 1,
    });

    const flashcardArtifacts = await listArtifactsByAgentAndKind(scope, 'distiller', 'flashcard', {
      day: TEST_DAY,
    });

    // Normalize for snapshot
    const normalizedFlashcards = flashcardArtifacts.map(a => ({
      agent: a.agent,
      kind: a.kind,
      day: a.day,
      status: a.status,
      contentStructure: {
        hasFormat: 'format' in a.content,
        hasFront: 'front' in a.content,
        hasBack: 'back' in a.content,
        hasDocumentTitle: 'documentTitle' in a.content,
      },
      format: a.content.format,
    }));

    expect(normalizedFlashcards).toMatchInlineSnapshot(`
      [
        {
          "agent": "distiller",
          "contentStructure": {
            "hasBack": true,
            "hasDocumentTitle": true,
            "hasFormat": true,
            "hasFront": true,
          },
          "day": "2025-01-15",
          "format": "qa",
          "kind": "flashcard",
          "status": "proposed",
        },
        {
          "agent": "distiller",
          "contentStructure": {
            "hasBack": true,
            "hasDocumentTitle": true,
            "hasFormat": true,
            "hasFront": true,
          },
          "day": "2025-01-15",
          "format": "cloze",
          "kind": "flashcard",
          "status": "proposed",
        },
      ]
    `);
  });

  it('should produce stable counts for single document', async () => {
    const docId = await insertTestDocument({
      title: SAMPLE_DOCUMENTS.spacedRepetition.title,
      content: SAMPLE_DOCUMENTS.spacedRepetition.content,
    });

    const { distillerGraph } = await import('@/server/agents/distiller.graph');

    const result = await distillerGraph({
      workspaceId: scope.workspaceId,
      day: TEST_DAY,
      documentIds: [docId],
      limit: 1,
    });

    // The exact counts depend on mock data
    expect(result.counts).toMatchInlineSnapshot(`
      {
        "conceptsProposed": 2,
        "docsProcessed": 1,
        "flashcardsProposed": 2,
      }
    `);
  });
});
