export interface WebSearchQuery {
  query: string;
  limit?: number;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearchTool(
  input: WebSearchQuery
): Promise<WebSearchResult[]> {
  // TODO: Implement web search integration
  // - Call external search API (e.g., Brave, Serper, etc.)
  // - Parse and return results
  return [];
}
