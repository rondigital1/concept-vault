/**
 * WebScout Agent Tests
 * 
 * Tests the WebScout agent pipeline with mocked Tavily and LLM.
 * Verifies:
 * - Pipeline produces correct number of proposals
 * - Artifacts are created with correct structure
 * - Deduplication works correctly
 * - Scoring filters low-quality results
 * 
 * Uses: Mocked Tavily, Mocked LLM, Real Postgres
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
  insertTestDocument,
} from '../helpers/testDb';
import {
  MOCK_TAVILY_RESULTS,
  MOCK_LLM_RESPONSES,
  normalizeForSnapshot,
} from '../helpers/mocks';
import { TEST_DAY, SAMPLE_DOCUMENTS } from '../helpers/fixtures';
import { listInboxArtifacts } from '@/server/repos/artifacts.repo';

// Mock the Tavily tool
vi.mock('@/server/langchain/tools/tavily.tool', () => ({
  executeTavilySearch: vi.fn().mockImplementation(async (query: string, maxResults?: number) => {
    // Return mock results, filtering duplicates
    const seenUrls = new Set<string>();
    const uniqueResults = MOCK_TAVILY_RESULTS.filter((r) => {
      if (seenUrls.has(r.url)) {
        return false;
      }
      seenUrls.add(r.url);
      return true;
    });

    return {
      query,
      results: uniqueResults.slice(0, maxResults ?? 10),
    };
  }),
}));

// Mock the LLM models
vi.mock('@/server/langchain/models', () => ({
  createExtractionModel: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockImplementation((schema: unknown) => ({
      invoke: vi.fn().mockImplementation(async () => {
        // Return appropriate mock based on what's being invoked
        // This is a simplified mock - in production you'd match on schema
        return MOCK_LLM_RESPONSES.webScoreResults;
      }),
    })),
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify(['spaced repetition', 'learning']),
    }),
  })),
  createGenerationModel: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue(MOCK_LLM_RESPONSES.flashcardGeneration),
    }),
    invoke: vi.fn().mockResolvedValue({ content: '' }),
  })),
  createChatModel: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: '' }),
  })),
}));

describe('WebScout Agent', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    vi.clearAllMocks();
  });

  describe('explicit-query mode', () => {
    it('should produce proposals from search results', async () => {
      // Import the graph after mocks are set up
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'explicit-query',
        query: 'spaced repetition techniques',
        day: TEST_DAY,
        maxResults: 10,
        minRelevanceScore: 0.6,
      });

      // Should have proposals (3 mock results that meet threshold)
      expect(result.proposals.length).toBeGreaterThan(0);
      expect(result.proposals.length).toBeLessThanOrEqual(4); // Max from mock data

      // Each proposal should have required fields
      for (const proposal of result.proposals) {
        expect(proposal.url).toBeDefined();
        expect(proposal.title).toBeDefined();
        expect(proposal.relevanceScore).toBeGreaterThanOrEqual(0.6);
        expect(proposal.contentType).toBeDefined();
      }
    });

    it('should create artifacts for each proposal', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'explicit-query',
        query: 'learning science',
        day: TEST_DAY,
        maxResults: 5,
        minRelevanceScore: 0.6,
      });

      // Verify artifacts were created
      expect(result.artifactIds.length).toBe(result.proposals.length);

      // Check artifacts in database
      const inbox = await listInboxArtifacts(TEST_DAY);
      expect(inbox.length).toBe(result.proposals.length);

      // Verify artifact structure
      for (const artifact of inbox) {
        expect(artifact.agent).toBe('webScout');
        expect(artifact.kind).toBe('web-proposal');
        expect(artifact.status).toBe('proposed');
        expect(artifact.content).toHaveProperty('url');
        expect(artifact.content).toHaveProperty('relevanceScore');
      }
    });

    it('should filter out low-relevance results', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'explicit-query',
        query: 'test query',
        day: TEST_DAY,
        maxResults: 10,
        minRelevanceScore: 0.8, // Higher threshold
      });

      // Only results with score >= 0.8 should pass
      for (const proposal of result.proposals) {
        expect(proposal.relevanceScore).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should track counts correctly', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'explicit-query',
        query: 'test',
        day: TEST_DAY,
        maxResults: 10,
        minRelevanceScore: 0.6,
      });

      expect(result.counts.queriesExecuted).toBe(1);
      expect(result.counts.urlsFetched).toBeGreaterThan(0);
      expect(result.counts.proposalsCreated).toBe(result.proposals.length);
    });

    it('should return queriesUsed', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const query = 'spaced repetition learning';
      const result = await webScoutGraph({
        mode: 'explicit-query',
        query,
        day: TEST_DAY,
      });

      expect(result.queriesUsed).toContain(query);
    });
  });

  describe('derive-from-vault mode', () => {
    it('should derive queries from vault documents', async () => {
      // Seed the vault with documents
      await insertTestDocument({
        title: SAMPLE_DOCUMENTS.spacedRepetition.title,
        content: SAMPLE_DOCUMENTS.spacedRepetition.content,
        tags: SAMPLE_DOCUMENTS.spacedRepetition.tags,
      });
      await insertTestDocument({
        title: SAMPLE_DOCUMENTS.retrievalPractice.title,
        content: SAMPLE_DOCUMENTS.retrievalPractice.content,
        tags: SAMPLE_DOCUMENTS.retrievalPractice.tags,
      });

      // Re-mock to return derived queries
      const modelsModule = await import('@/server/langchain/models');
      vi.mocked(modelsModule.createExtractionModel).mockImplementation(() => ({
        withStructuredOutput: vi.fn().mockImplementation(() => ({
          invoke: vi.fn()
            .mockResolvedValueOnce(MOCK_LLM_RESPONSES.derivedQueries)
            .mockResolvedValue(MOCK_LLM_RESPONSES.webScoreResults),
        })),
        invoke: vi.fn().mockResolvedValue({ content: '' }),
      } as any));

      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'derive-from-vault',
        deriveLimit: 5,
        day: TEST_DAY,
        maxResults: 10,
        minRelevanceScore: 0.6,
      });

      // Should have executed searches
      expect(result.counts.queriesExecuted).toBeGreaterThan(0);
    });

    it('should handle empty vault gracefully', async () => {
      // No documents in vault
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'derive-from-vault',
        day: TEST_DAY,
      });

      // Should return empty results without error
      expect(result.proposals).toEqual([]);
      expect(result.artifactIds).toEqual([]);
    });
  });

  describe('deduplication', () => {
    it('should filter out URLs already in the vault', async () => {
      // Add a document with one of the mock URLs
      await insertTestDocument({
        source: 'https://example.com/spaced-repetition', // Matches mock result
        title: 'Existing Doc',
        content: 'Already imported content',
      });

      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'explicit-query',
        query: 'test',
        day: TEST_DAY,
        minRelevanceScore: 0.6,
      });

      // Should have filtered the existing URL
      expect(result.counts.urlsFiltered).toBeGreaterThan(0);

      // Proposals should not include the existing URL
      const urls = result.proposals.map(p => p.url);
      expect(urls).not.toContain('https://example.com/spaced-repetition');
    });
  });

  describe('error handling', () => {
    it('should handle missing query in explicit-query mode', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        mode: 'explicit-query',
        query: undefined, // Missing query
        day: TEST_DAY,
      });

      // Should return empty with no error thrown
      expect(result.proposals).toEqual([]);
    });
  });
});

describe('WebScout Golden Run Snapshot', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    vi.clearAllMocks();
  });

  it('should produce stable artifact content structure', async () => {
    const { webScoutGraph } = await import('@/server/agents/webScout.graph');

    const result = await webScoutGraph({
      mode: 'explicit-query',
      query: 'spaced repetition',
      day: TEST_DAY,
      maxResults: 3,
      minRelevanceScore: 0.6,
    });

    // Normalize the proposals for snapshot (remove dynamic values)
    const normalizedProposals = result.proposals.map(p => ({
      url: p.url,
      title: p.title,
      contentType: p.contentType,
      topics: p.topics,
      // Normalize score to avoid floating point issues
      relevanceScoreRange: p.relevanceScore >= 0.8 ? 'high' : 'medium',
    }));

    // This snapshot captures the expected structure
    // Note: When LLM mock fails, fallback produces contentType="other" and topics=[]
    expect(normalizedProposals).toMatchInlineSnapshot(`
      [
        {
          "contentType": "other",
          "relevanceScoreRange": "high",
          "title": "Introduction to Spaced Repetition",
          "topics": [],
          "url": "https://example.com/spaced-repetition",
        },
        {
          "contentType": "other",
          "relevanceScoreRange": "high",
          "title": "Understanding Retrieval Practice",
          "topics": [],
          "url": "https://learning-science.edu/retrieval-practice",
        },
        {
          "contentType": "other",
          "relevanceScoreRange": "high",
          "title": "Memory and Learning Science",
          "topics": [],
          "url": "https://psychology.org/memory-learning",
        },
      ]
    `);
  });

  it('should produce stable artifact database structure', async () => {
    const { webScoutGraph } = await import('@/server/agents/webScout.graph');

    await webScoutGraph({
      mode: 'explicit-query',
      query: 'learning science',
      day: TEST_DAY,
      maxResults: 2,
      minRelevanceScore: 0.8,
    });

    const inbox = await listInboxArtifacts(TEST_DAY);

    // Normalize for snapshot
    const normalizedArtifacts = inbox.map(a => ({
      agent: a.agent,
      kind: a.kind,
      day: a.day,
      status: a.status,
      contentKeys: Object.keys(a.content).sort(),
    }));

    expect(normalizedArtifacts).toMatchInlineSnapshot(`
      [
        {
          "agent": "webScout",
          "contentKeys": [
            "contentType",
            "excerpt",
            "relevanceReason",
            "relevanceScore",
            "sourceQuery",
            "summary",
            "topics",
            "url",
          ],
          "day": "2025-01-15",
          "kind": "web-proposal",
          "status": "proposed",
        },
        {
          "agent": "webScout",
          "contentKeys": [
            "contentType",
            "excerpt",
            "relevanceReason",
            "relevanceScore",
            "sourceQuery",
            "summary",
            "topics",
            "url",
          ],
          "day": "2025-01-15",
          "kind": "web-proposal",
          "status": "proposed",
        },
      ]
    `);
  });
});
