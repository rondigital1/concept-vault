import { WebSearchResult } from "../tools/webSearch.tool";
import { tavily } from '@tavily/core';

let client: ReturnType<typeof tavily> | null = null;

function getClient() {
  if (!client) {
    client = tavily({ apiKey: process.env.TAVILY_API_KEY });
  }

  return client;
}

export async function searchWeb(query: string, maxResults = 10): Promise<WebSearchResult[]> {
  const response = await getClient().search(query, {
    maxResults: maxResults,
    searchDepth: 'advanced',
  });

  return response.results.map((result: any) => ({ url: result.url, title: result.title, snippet: result.content })) as WebSearchResult[];
}