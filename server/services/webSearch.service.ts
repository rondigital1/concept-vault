import { WebSearchResult } from "../tools/webSearch.tool";
import { tavily } from '@tavily/core';

let client: ReturnType<typeof tavily> | null = null;

type TavilyResult = {
  url: string;
  title: string;
  content: string;
};

function getClient() {
  if (!client) {
    client = tavily({ apiKey: process.env.TAVILY_API_KEY });
  }

  return client;
}

export async function searchWeb(query: string, maxResults = 10): Promise<WebSearchResult[]> {
  const boundedMaxResults = Math.max(1, Math.min(Math.floor(maxResults), 20));
  const response = await getClient().search(query, {
    maxResults: boundedMaxResults,
    searchDepth: 'advanced',
  });

  const results = response.results as TavilyResult[];
  return results.map((result) => ({
    url: result.url,
    title: result.title,
    snippet: result.content,
  }));
}
