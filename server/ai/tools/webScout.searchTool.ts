import { searchWebArgsSchema } from '@/server/ai/tools/webScout.toolSchemas';
import { executeTavilySearch } from '@/server/langchain/tools/tavily.tool';
import { assertTrustedSource } from '@/server/security/sourceTrust';

function clampMaxResults(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 8;
  }

  return Math.max(1, Math.min(Math.floor(value), 20));
}

export async function searchWebTool(args: unknown): Promise<string> {
  const parsed = searchWebArgsSchema.parse(args);
  const response = await executeTavilySearch(parsed.query, clampMaxResults(parsed.maxResults), 'basic', {
    includeDomains: parsed.includeDomains ?? undefined,
    excludeDomains: parsed.excludeDomains ?? undefined,
  });
  const results = response.results.flatMap((result) => {
    const snippet = result.content.slice(0, 1000);
    try {
      assertTrustedSource({
        context: 'web_scout_search',
        url: result.url,
        title: result.title,
        snippet,
      });
      return [{
        url: result.url,
        title: result.title,
        snippet,
        score: result.score,
        ...(result.publishedDate ? { publishedDate: result.publishedDate } : {}),
      }];
    } catch {
      return [];
    }
  });

  return JSON.stringify(results);
}
