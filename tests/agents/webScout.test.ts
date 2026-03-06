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
import {
  initTestSchema,
  cleanAllTables,
  closeTestDb,
} from '../helpers/testDb';
import { TEST_DAY } from '../helpers/fixtures';
import { listInboxArtifacts } from '@/server/repos/artifacts.repo';

// Track LLM call count for multi-iteration tests
let llmCallCount = 0;

function createDefaultToolRoundMock() {
  return vi.fn().mockImplementation(async () => {
    llmCallCount += 1;

    if (llmCallCount === 1) {
      return {
        outputText: '',
        responseId: 'resp-1',
        retryCount: 0,
        tier: 'default',
        model: 'gpt-5-mini',
        toolCalls: [
          {
            callId: 'call_1',
            name: 'searchWeb',
            arguments: { query: 'spaced repetition techniques', maxResults: 8 },
          },
        ],
        usage: {
          cachedInputTokens: 0,
          inputTokens: 100,
          outputTokens: 20,
          reasoningTokens: 0,
          totalTokens: 120,
        },
        estimatedCostUsd: 0.001,
        actualCostUsd: 0.001,
        wasEscalated: false,
      };
    }

    if (llmCallCount === 2) {
      return {
        outputText: '',
        responseId: 'resp-2',
        retryCount: 0,
        tier: 'default',
        model: 'gpt-5-mini',
        toolCalls: [
          {
            callId: 'call_2',
            name: 'checkVaultDuplicate',
            arguments: {
              urls: [
                'https://example.com/spaced-repetition',
                'https://learning-science.edu/retrieval',
                'https://mit.edu/memory',
              ],
            },
          },
        ],
        usage: {
          cachedInputTokens: 0,
          inputTokens: 100,
          outputTokens: 20,
          reasoningTokens: 0,
          totalTokens: 120,
        },
        estimatedCostUsd: 0.001,
        actualCostUsd: 0.001,
        wasEscalated: false,
      };
    }

    if (llmCallCount === 3) {
      return {
        outputText: '',
        responseId: 'resp-3',
        retryCount: 0,
        tier: 'default',
        model: 'gpt-5-mini',
        toolCalls: [
          {
            callId: 'call_3a',
            name: 'evaluateResult',
            arguments: {
              url: 'https://example.com/spaced-repetition',
              title: 'Introduction to Spaced Repetition',
              snippet: 'Spaced repetition is a learning technique...',
              goal: 'spaced repetition techniques',
            },
          },
          {
            callId: 'call_3b',
            name: 'evaluateResult',
            arguments: {
              url: 'https://learning-science.edu/retrieval',
              title: 'Retrieval Practice Research',
              snippet: 'Retrieval practice improves learning...',
              goal: 'spaced repetition techniques',
            },
          },
          {
            callId: 'call_3c',
            name: 'evaluateResult',
            arguments: {
              url: 'https://mit.edu/memory',
              title: 'Memory Science at MIT',
              snippet: 'Advanced memory research and findings...',
              goal: 'spaced repetition techniques',
            },
          },
        ],
        usage: {
          cachedInputTokens: 0,
          inputTokens: 100,
          outputTokens: 20,
          reasoningTokens: 0,
          totalTokens: 120,
        },
        estimatedCostUsd: 0.001,
        actualCostUsd: 0.001,
        wasEscalated: false,
      };
    }

    return {
      outputText:
        'Found 3 high-quality resources covering spaced repetition, retrieval practice, and memory science.',
      responseId: 'resp-4',
      retryCount: 0,
      tier: 'default',
      model: 'gpt-5-mini',
      toolCalls: [],
      usage: {
        cachedInputTokens: 0,
        inputTokens: 100,
        outputTokens: 20,
        reasoningTokens: 0,
        totalTokens: 120,
      },
      estimatedCostUsd: 0.001,
      actualCostUsd: 0.001,
      wasEscalated: false,
    };
  });
}

const mockExecuteToolRound = vi.hoisted(() => createDefaultToolRoundMock());
const mockExecuteStructured = vi.hoisted(() => vi.fn());
const mockExecuteText = vi.hoisted(() => vi.fn());

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

// ---------- Mock Source Watchlist ----------

vi.mock('@/server/services/sourceWatch.service', () => ({
  checkoutDueSources: vi.fn().mockResolvedValue([]),
}));

// ---------- Mock URL Extraction ----------

vi.mock('@/server/services/urlExtract.service', () => ({
  extractDocumentFromUrl: vi.fn().mockResolvedValue({
    title: 'Mock Extracted Article',
    content: 'This is extracted article content with enough detail to be ingested into the library successfully.',
    method: 'fetch',
  }),
  isHttpUrl: vi.fn((value: string) => value.startsWith('http://') || value.startsWith('https://')),
}));

vi.mock('@/server/ai/openai-execution-service', () => ({
  openAIExecutionService: {
    executeToolRound: mockExecuteToolRound,
    executeStructured: mockExecuteStructured,
    executeText: mockExecuteText,
  },
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
    mockExecuteToolRound.mockImplementation(createDefaultToolRoundMock());
    mockExecuteStructured.mockResolvedValue({
      output: {
        relevanceScore: 0.85,
        contentType: 'article',
        topics: ['learning'],
        reasoning: 'Relevant to learning goal',
      },
    });
    mockExecuteText.mockResolvedValue({
      output: 'refined query',
    });
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
      mockExecuteToolRound.mockResolvedValue({
        outputText: '',
        responseId: 'resp-stuck',
        retryCount: 0,
        tier: 'default',
        model: 'gpt-5-mini',
        toolCalls: [
          {
            callId: 'call_s',
            name: 'searchWeb',
            arguments: { query: 'test', maxResults: 5 },
          },
        ],
        usage: {
          cachedInputTokens: 0,
          inputTokens: 50,
          outputTokens: 10,
          reasoningTokens: 0,
          totalTokens: 60,
        },
        estimatedCostUsd: 0.001,
        actualCostUsd: 0.001,
        wasEscalated: false,
      });

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
      mockExecuteToolRound.mockResolvedValue({
        outputText: '',
        responseId: 'resp-query-limit',
        retryCount: 0,
        tier: 'default',
        model: 'gpt-5-mini',
        toolCalls: [
          {
            callId: 'call_s',
            name: 'searchWeb',
            arguments: { query: 'test', maxResults: 5 },
          },
        ],
        usage: {
          cachedInputTokens: 0,
          inputTokens: 50,
          outputTokens: 10,
          reasoningTokens: 0,
          totalTokens: 60,
        },
        estimatedCostUsd: 0.001,
        actualCostUsd: 0.001,
        wasEscalated: false,
      });

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
      expect(result.terminationReason).toBe('max_queries');
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

  describe('trusted source mode', () => {
    it('should constrain search to watchlist domains when restricted mode is enabled', async () => {
      const sourceWatchModule = await import('@/server/services/sourceWatch.service');
      vi.mocked(sourceWatchModule.checkoutDueSources).mockResolvedValueOnce([
        {
          id: 'watch-1',
          url: 'https://mit.edu',
          domain: 'mit.edu',
          label: 'MIT',
          kind: 'source',
          isActive: true,
          checkIntervalHours: 24,
          lastCheckedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const { webScoutGraph } = await import('@/server/agents/webScout.graph');
      await webScoutGraph({
        goal: 'spaced repetition techniques',
        mode: 'derive-from-vault',
        day: TEST_DAY,
        restrictToWatchlistDomains: true,
      });

      const tavilyModule = await import('@/server/langchain/tools/tavily.tool');
      const searchCalls = vi.mocked(tavilyModule.executeTavilySearch).mock.calls;
      expect(searchCalls.length).toBeGreaterThan(0);
      expect(searchCalls[0]?.[3]).toEqual(
        expect.objectContaining({
          includeDomains: ['mit.edu'],
        }),
      );
    });
  });
});
