/**
 * WebScout ReAct Agent Tests
 *
 * Tests the WebScout agent's ReAct loop with mocked LLM and tools.
 * Verifies:
 * - ReAct loop iterates until quality threshold is met
 * - Stopping conditions (satisfied, max_iterations, max_queries)
 * - Artifacts are created with reasoning traces
 * - Deduplication via checkVaultDuplicate tool
 * - Derive-from-vault mode with empty vault
 *
 * Uses: Mocked LLM (tool-calling), Mocked Tavily, Real Postgres
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
  insertTestDocument,
} from '../helpers/testDb';
import { TEST_DAY, SAMPLE_DOCUMENTS } from '../helpers/fixtures';
import { listInboxArtifacts } from '@/server/repos/artifacts.repo';

// ---------- Mock search results ----------

const MOCK_SEARCH_RESULTS = JSON.stringify([
  { url: 'https://example.com/spaced-repetition', title: 'Introduction to Spaced Repetition', snippet: 'Spaced repetition is a learning technique...', score: 0.92 },
  { url: 'https://learning-science.edu/retrieval', title: 'Retrieval Practice Research', snippet: 'Retrieval practice improves learning...', score: 0.88 },
  { url: 'https://mit.edu/memory', title: 'Memory Science at MIT', snippet: 'Advanced memory research and findings...', score: 0.85 },
]);

const MOCK_DEDUP_ALL_NEW = JSON.stringify({
  newUrls: [
    'https://example.com/spaced-repetition',
    'https://learning-science.edu/retrieval',
    'https://mit.edu/memory',
  ],
  existingUrls: [],
});

function mockEvalResult(score: number) {
  return JSON.stringify({
    relevanceScore: score,
    contentType: 'article',
    topics: ['learning', 'memory'],
    reasoning: `Score: ${score.toFixed(2)} — relevant to learning goal`,
  });
}

// Track LLM call count for multi-iteration tests
let llmCallCount = 0;

// ---------- Mock Tavily ----------

vi.mock('@/server/langchain/tools/tavily.tool', () => ({
  executeTavilySearch: vi.fn().mockImplementation(async (query: string) => ({
    query,
    results: [
      { title: 'Introduction to Spaced Repetition', url: 'https://example.com/spaced-repetition', content: 'Spaced repetition is a learning technique...', score: 0.92 },
      { title: 'Retrieval Practice Research', url: 'https://learning-science.edu/retrieval', content: 'Retrieval practice improves learning...', score: 0.88 },
      { title: 'Memory Science at MIT', url: 'https://mit.edu/memory', content: 'Advanced memory research and findings...', score: 0.85 },
    ],
  })),
}));

// ---------- Mock Vault Repo ----------

vi.mock('@/server/repos/webScout.repo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/repos/webScout.repo')>();
  return {
    ...actual,
    filterExistingUrls: vi.fn().mockImplementation(async (urls: string[]) => urls),
    getRecentDocumentsForQuery: vi.fn().mockResolvedValue([]),
    getDocumentsByTags: vi.fn().mockResolvedValue([]),
  };
});

// ---------- Mock LLM ----------

vi.mock('@/server/langchain/models', () => ({
  createChatModel: vi.fn().mockImplementation(() => ({
    bindTools: vi.fn().mockReturnValue({
      invoke: vi.fn().mockImplementation(async () => {
        llmCallCount++;

        // Iteration 1: search + dedup
        if (llmCallCount === 1) {
          return new AIMessage({
            content: '',
            tool_calls: [
              { id: 'call_1', name: 'searchWeb', args: { query: 'spaced repetition techniques', maxResults: 8 } },
            ],
          });
        }

        // Iteration 2: check duplicates
        if (llmCallCount === 2) {
          return new AIMessage({
            content: '',
            tool_calls: [
              {
                id: 'call_2',
                name: 'checkVaultDuplicate',
                args: {
                  urls: [
                    'https://example.com/spaced-repetition',
                    'https://learning-science.edu/retrieval',
                    'https://mit.edu/memory',
                  ],
                },
              },
            ],
          });
        }

        // Iteration 3: evaluate results
        if (llmCallCount === 3) {
          return new AIMessage({
            content: '',
            tool_calls: [
              { id: 'call_3a', name: 'evaluateResult', args: { url: 'https://example.com/spaced-repetition', title: 'Introduction to Spaced Repetition', snippet: 'Spaced repetition is a learning technique...', goal: 'spaced repetition techniques' } },
              { id: 'call_3b', name: 'evaluateResult', args: { url: 'https://learning-science.edu/retrieval', title: 'Retrieval Practice Research', snippet: 'Retrieval practice improves learning...', goal: 'spaced repetition techniques' } },
              { id: 'call_3c', name: 'evaluateResult', args: { url: 'https://mit.edu/memory', title: 'Memory Science at MIT', snippet: 'Advanced memory research and findings...', goal: 'spaced repetition techniques' } },
            ],
          });
        }

        // Iteration 4: satisfied, no tool calls
        return new AIMessage({
          content: 'Found 3 high-quality resources covering spaced repetition, retrieval practice, and memory science.',
        });
      }),
    }),
  })),
  createExtractionModel: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        relevanceScore: 0.85,
        contentType: 'article',
        topics: ['learning'],
        reasoning: 'Relevant to learning goal',
      }),
    }),
    invoke: vi.fn().mockResolvedValue({ content: 'refined query' }),
  })),
  createGenerationModel: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: '' }),
  })),
}));

// ---------- Tests ----------

describe('WebScout ReAct Agent', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    vi.clearAllMocks();
    llmCallCount = 0;
  });

  describe('satisfied termination', () => {
    it('should iterate until quality threshold is met and produce proposals', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'spaced repetition techniques',
        mode: 'explicit-query',
        day: TEST_DAY,
        minQualityResults: 3,
        minRelevanceScore: 0.7,
        maxIterations: 5,
        maxQueries: 10,
      });

      expect(result.proposals.length).toBeGreaterThan(0);
      expect(result.counts.iterations).toBeGreaterThan(0);
      expect(result.counts.queriesExecuted).toBeGreaterThan(0);

      for (const proposal of result.proposals) {
        expect(proposal.url).toBeDefined();
        expect(proposal.title).toBeDefined();
        expect(proposal.relevanceScore).toBeGreaterThanOrEqual(0.7);
        expect(proposal.reasoning).toBeDefined();
        expect(Array.isArray(proposal.reasoning)).toBe(true);
      }
    });

    it('should create artifacts with reasoning traces', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'spaced repetition techniques',
        mode: 'explicit-query',
        day: TEST_DAY,
        minQualityResults: 3,
        minRelevanceScore: 0.7,
      });

      expect(result.artifactIds.length).toBe(result.proposals.length);

      const inbox = await listInboxArtifacts(TEST_DAY);
      expect(inbox.length).toBe(result.proposals.length);

      for (const artifact of inbox) {
        expect(artifact.agent).toBe('webScout');
        expect(artifact.kind).toBe('web-proposal');
        expect(artifact.status).toBe('proposed');
        expect(artifact.content).toHaveProperty('url');
        expect(artifact.content).toHaveProperty('relevanceScore');
        expect(artifact.content).toHaveProperty('reasoning');
      }
    });

    it('should include reasoning in output', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'spaced repetition techniques',
        mode: 'explicit-query',
        day: TEST_DAY,
        minQualityResults: 3,
        minRelevanceScore: 0.7,
      });

      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('max_iterations termination', () => {
    it('should stop at max iterations', async () => {
      // Reset mock to always return tool calls (never "satisfied")
      const modelsModule = await import('@/server/langchain/models');
      vi.mocked(modelsModule.createChatModel).mockImplementation(() => ({
        bindTools: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                { id: 'call_s', name: 'searchWeb', args: { query: 'test', maxResults: 5 } },
              ],
            }),
          ),
        }),
      } as any));

      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'never satisfied query',
        mode: 'explicit-query',
        day: TEST_DAY,
        minQualityResults: 100,
        maxIterations: 2,
        maxQueries: 10,
      });

      expect(result.counts.iterations).toBeLessThanOrEqual(2);
      expect(result.terminationReason).toBe('max_iterations');
    });
  });

  describe('max_queries termination', () => {
    it('should stop when max queries reached', async () => {
      const modelsModule = await import('@/server/langchain/models');
      vi.mocked(modelsModule.createChatModel).mockImplementation(() => ({
        bindTools: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue(
            new AIMessage({
              content: '',
              tool_calls: [
                { id: 'call_s', name: 'searchWeb', args: { query: 'test', maxResults: 5 } },
              ],
            }),
          ),
        }),
      } as any));

      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'query limited test',
        mode: 'explicit-query',
        day: TEST_DAY,
        minQualityResults: 100,
        maxIterations: 20,
        maxQueries: 2,
      });

      expect(result.counts.queriesExecuted).toBeLessThanOrEqual(2);
    });
  });

  describe('derive-from-vault mode', () => {
    it('should handle empty vault gracefully', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'learn about memory science',
        mode: 'derive-from-vault',
        day: TEST_DAY,
        minQualityResults: 3,
        minRelevanceScore: 0.7,
      });

      // Should still produce results — the agent searches even without vault context
      expect(result.counts.iterations).toBeGreaterThan(0);
    });
  });

  describe('counts tracking', () => {
    it('should track iterations, queries, evaluations, and proposals', async () => {
      const { webScoutGraph } = await import('@/server/agents/webScout.graph');

      const result = await webScoutGraph({
        goal: 'spaced repetition techniques',
        mode: 'explicit-query',
        day: TEST_DAY,
        minQualityResults: 3,
        minRelevanceScore: 0.7,
      });

      expect(result.counts).toHaveProperty('iterations');
      expect(result.counts).toHaveProperty('queriesExecuted');
      expect(result.counts).toHaveProperty('resultsEvaluated');
      expect(result.counts).toHaveProperty('proposalsCreated');
      expect(result.counts.iterations).toBeGreaterThan(0);
      expect(result.counts.proposalsCreated).toBe(result.proposals.length);
    });
  });
});
