/**
 * LangChain tool wrapper for Tavily search.
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { tavilySearch, TavilySearchResponse } from '@/server/tools/tavily.tool';

export const TavilySearchInputSchema = z.object({
  query: z.string().describe('Search query'),
  maxResults: z.number().int().min(1).max(20).optional().default(10).describe('Maximum number of results'),
  searchDepth: z.enum(['basic', 'advanced']).optional().default('basic'),
  includeDomains: z.array(z.string()).optional().describe('Optional domain allowlist.'),
  excludeDomains: z.array(z.string()).optional().describe('Optional domain denylist.'),
});

/**
 * Creates a LangChain tool for Tavily web search.
 */
export function createTavilySearchTool() {
  return new DynamicStructuredTool({
    name: 'tavily_search',
    description: 'Search the web using Tavily. Returns relevant web pages with titles, URLs, and content excerpts.',
    schema: TavilySearchInputSchema,
    func: async ({ query, maxResults, searchDepth, includeDomains, excludeDomains }): Promise<string> => {
      const response = await tavilySearch(query, {
        maxResults,
        searchDepth,
        includeDomains,
        excludeDomains,
      });

      return JSON.stringify({
        query: response.query,
        results: response.results.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content.slice(0, 500),
          score: r.score,
        })),
      });
    },
  });
}

/**
 * Execute Tavily search directly (for use in graph nodes).
 */
export async function executeTavilySearch(
  query: string,
  maxResults: number = 10,
  searchDepth: 'basic' | 'advanced' = 'basic',
  options?: { includeDomains?: string[]; excludeDomains?: string[] },
): Promise<TavilySearchResponse> {
  const boundedMaxResults = Math.max(1, Math.min(Math.floor(maxResults), 20));

  return tavilySearch(query, {
    maxResults: boundedMaxResults,
    searchDepth,
    includeDomains: options?.includeDomains,
    excludeDomains: options?.excludeDomains,
  });
}
