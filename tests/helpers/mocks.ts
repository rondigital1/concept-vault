/**
 * Mock implementations for external services.
 * 
 * Provides:
 * - LLM mock that returns Zod-conforming structured outputs
 * - Tavily mock that returns stable search results
 */
import { vi } from 'vitest';

// ============================================================
// Tavily Mock
// ============================================================

export interface MockTavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface MockTavilyResponse {
  query: string;
  results: MockTavilyResult[];
}

/**
 * Standard mock Tavily results for WebScout tests.
 * Includes varied domains and some duplicates for dedup testing.
 */
export const MOCK_TAVILY_RESULTS: MockTavilyResult[] = [
  {
    title: 'Introduction to Spaced Repetition',
    url: 'https://example.com/spaced-repetition',
    content: 'Spaced repetition is a learning technique that involves reviewing material at increasing intervals. This method leverages the spacing effect to improve long-term retention of information.',
    score: 0.92,
  },
  {
    title: 'Understanding Retrieval Practice',
    url: 'https://learning-science.edu/retrieval-practice',
    content: 'Retrieval practice is the act of recalling information from memory. Studies show it dramatically improves learning compared to passive review methods.',
    score: 0.88,
  },
  {
    title: 'Memory and Learning Science',
    url: 'https://psychology.org/memory-learning',
    content: 'The science of memory and learning has advanced significantly. Key findings include the testing effect, spaced repetition, and interleaving practice.',
    score: 0.85,
  },
  {
    title: 'Duplicate URL Test',
    url: 'https://example.com/spaced-repetition', // Duplicate URL
    content: 'This is a duplicate entry with the same URL.',
    score: 0.70,
  },
  {
    title: 'Low Quality Result',
    url: 'https://spam-site.com/clickbait',
    content: 'This is a low quality result that should be filtered out.',
    score: 0.30,
  },
];

/**
 * Create a mock for the Tavily search function.
 */
export function createMockTavilySearch(results: MockTavilyResult[] = MOCK_TAVILY_RESULTS) {
  return vi.fn().mockImplementation(
    async (query: string, _maxResults?: number, _searchDepth?: string): Promise<MockTavilyResponse> => {
      return {
        query,
        results: results.slice(0, _maxResults ?? 10),
      };
    }
  );
}

// ============================================================
// LLM Mock
// ============================================================

/**
 * Mock structured output responses that conform to Zod schemas.
 */
export const MOCK_LLM_RESPONSES = {
  // For TagExtractionSchema
  tagExtraction: {
    tags: ['spaced repetition', 'learning science', 'memory', 'retrieval practice'],
  },

  // For CategorizationSchema  
  categorization: {
    category: 'learning',
  },

  // For ConceptExtractionSchema
  conceptExtraction: {
    concepts: [
      {
        label: 'Spaced Repetition',
        type: 'principle' as const,
        summary: 'A learning technique that involves reviewing material at increasing intervals to improve long-term retention.',
        evidence: [
          { quote: 'Spaced repetition is a learning technique that involves reviewing material at increasing intervals.' },
        ],
      },
      {
        label: 'Testing Effect',
        type: 'principle' as const,
        summary: 'The finding that actively recalling information improves memory more than passive review.',
        evidence: [
          { quote: 'Studies show retrieval practice dramatically improves learning compared to passive review.' },
        ],
      },
    ],
  },

  // For FlashcardGenerationSchema
  flashcardGeneration: {
    flashcards: [
      {
        format: 'qa' as const,
        front: 'What is spaced repetition?',
        back: 'A learning technique that involves reviewing material at increasing intervals to improve long-term retention.',
        conceptLabel: 'Spaced Repetition',
      },
      {
        format: 'cloze' as const,
        front: 'The {{testing effect}} refers to the finding that actively recalling information improves memory.',
        back: 'The testing effect refers to the finding that actively recalling information improves memory.',
        conceptLabel: 'Testing Effect',
      },
    ],
  },

  // For DerivedQueriesSchema
  derivedQueries: {
    queries: [
      { query: 'spaced repetition techniques', intent: 'Find practical methods', priority: 1 },
      { query: 'retrieval practice research', intent: 'Find academic sources', priority: 2 },
      { query: 'memory improvement science', intent: 'Find foundational knowledge', priority: 3 },
    ],
  },

  // For WebScoreResultsSchema
  webScoreResults: {
    scores: [
      {
        index: 0,
        relevanceScore: 0.92,
        relevanceReason: 'Directly addresses spaced repetition with actionable information.',
        contentType: 'article' as const,
        topics: ['spaced repetition', 'learning'],
      },
      {
        index: 1,
        relevanceScore: 0.88,
        relevanceReason: 'Covers retrieval practice with research backing.',
        contentType: 'documentation' as const,
        topics: ['retrieval practice', 'learning science'],
      },
      {
        index: 2,
        relevanceScore: 0.85,
        relevanceReason: 'Comprehensive overview of memory and learning science.',
        contentType: 'article' as const,
        topics: ['memory', 'learning', 'science'],
      },
    ],
  },
};

/**
 * Mock model that returns structured output.
 * Used to mock createExtractionModel().withStructuredOutput().
 */
export function createMockStructuredModel<T>(response: T) {
  return {
    invoke: vi.fn().mockResolvedValue(response),
  };
}

/**
 * Create a mock for createExtractionModel that returns appropriate responses
 * based on the schema being used.
 */
export function createMockExtractionModelFactory() {
  return vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockImplementation((schema: { description?: string }) => {
      // Determine which response to return based on schema shape
      // This is a heuristic - in real tests you might want to be more explicit
      return {
        invoke: vi.fn().mockImplementation(async () => {
          // Default to concept extraction
          return MOCK_LLM_RESPONSES.conceptExtraction;
        }),
      };
    }),
    invoke: vi.fn().mockResolvedValue({
      content: JSON.stringify(['spaced repetition', 'learning']),
    }),
  }));
}

// ============================================================
// ID Normalizer for Snapshots
// ============================================================

/**
 * Normalize UUIDs and timestamps in objects for snapshot testing.
 * Replaces dynamic values with stable placeholders.
 */
export function normalizeForSnapshot<T>(obj: T): T {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/g;

  const json = JSON.stringify(obj);

  // Replace UUIDs with placeholder
  let normalized = json.replace(uuidRegex, '<UUID>');

  // Replace ISO timestamps with placeholder
  normalized = normalized.replace(isoDateRegex, '<TIMESTAMP>');

  return JSON.parse(normalized);
}

/**
 * Normalize artifact content for snapshot comparison.
 * Keeps the structure but removes dynamic IDs and timestamps.
 */
export function normalizeArtifactForSnapshot(artifact: {
  id?: string;
  run_id?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  [key: string]: unknown;
}): Record<string, unknown> {
  const { id, run_id, created_at, reviewed_at, ...rest } = artifact;
  return {
    ...rest,
    id: '<UUID>',
    run_id: run_id ? '<UUID>' : null,
    created_at: '<TIMESTAMP>',
    reviewed_at: reviewed_at ? '<TIMESTAMP>' : null,
  };
}
