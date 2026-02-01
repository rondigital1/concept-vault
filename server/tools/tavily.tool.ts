/**
 * Tavily Tool
 *
 * Thin wrapper around the Tavily SDK for web search and content extraction.
 */

import { tavily } from '@tavily/core';

// Initialize Tavily client (lazy - created on first use)
let client: ReturnType<typeof tavily> | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY environment variable is not set');
    }
    client = tavily({ apiKey });
  }
  return client;
}

export interface TavilySearchOptions {
  maxResults?: number;
  includeAnswer?: boolean;
  searchDepth?: 'basic' | 'advanced';
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
}

/**
 * Search the web using Tavily
 */
export async function tavilySearch(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse> {
  const tvly = getClient();

  const response = await tvly.search(query, {
    maxResults: options.maxResults ?? 10,
    includeAnswer: options.includeAnswer ?? false,
    searchDepth: options.searchDepth ?? 'basic',
    includeDomains: options.includeDomains,
    excludeDomains: options.excludeDomains,
  });

  return {
    query: response.query,
    answer: response.answer,
    results: response.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      publishedDate: r.publishedDate,
    })),
  };
}

export interface TavilyExtractResult {
  url: string;
  rawContent: string;
}

export interface TavilyExtractResponse {
  results: TavilyExtractResult[];
  failedResults: Array<{ url: string; error: string }>;
}

/**
 * Extract content from URLs using Tavily
 */
export async function tavilyExtract(urls: string[]): Promise<TavilyExtractResponse> {
  const tvly = getClient();

  const response = await tvly.extract(urls);

  return {
    results: response.results.map((r) => ({
      url: r.url,
      rawContent: r.rawContent,
    })),
    failedResults: response.failedResults?.map((f) => ({
      url: f.url,
      error: f.error,
    })) ?? [],
  };
}
