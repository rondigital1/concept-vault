/**
 * Node implementations for the WebScout agent.
 */
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createExtractionModel } from '@/server/langchain/models';
import { DerivedQueriesSchema, WebScoreResultsSchema } from '@/server/langchain/schemas/webScore.schema';
import { executeTavilySearch } from '@/server/langchain/tools/tavily.tool';
import { TavilySearchResult } from '@/server/tools/tavily.tool';
import {
  DocumentRow,
  getRecentDocumentsForQuery,
  getDocumentsByTags,
  filterExistingUrls,
  insertWebProposalArtifact,
} from '@/server/repos/webScout.repo';
import { WebScoutProposal, ScoredResult, WebScoutStateType } from './webScout.types';

export async function prepareQueries(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  if (state.mode === 'explicit-query') {
    if (!state.explicitQuery) {
      return { error: 'Query is required for explicit-query mode', queries: [] };
    }
    return { queries: [state.explicitQuery], vaultDocuments: [] };
  }

  // Derive queries from vault documents
  let vaultDocuments: DocumentRow[];

  if (state.focusTags && state.focusTags.length > 0) {
    vaultDocuments = await getDocumentsByTags(state.focusTags, state.deriveLimit);
  } else {
    vaultDocuments = await getRecentDocumentsForQuery(state.deriveLimit);
  }

  if (vaultDocuments.length === 0) {
    return { queries: [], vaultDocuments: [], error: null };
  }

  const docSummaries = vaultDocuments
    .map((doc, i) => {
      const truncatedContent = doc.content.slice(0, 1500);
      return `Document ${i + 1}: "${doc.title}"\nTags: ${doc.tags.join(', ') || 'none'}\nExcerpt: ${truncatedContent}`;
    })
    .join('\n\n---\n\n');

  const model = createExtractionModel({ temperature: 0.4 }).withStructuredOutput(
    DerivedQueriesSchema
  );

  try {
    const result = await model.invoke([
      new SystemMessage(`You are analyzing a user's knowledge vault to suggest web searches that would find related content.

Based on the documents, suggest 3-5 search queries that would find:
1. Deeper dives into topics the user is learning
2. Related concepts that complement their knowledge
3. Recent developments or updates in these areas
4. Practical applications or tutorials

Queries should be specific and actionable. Avoid overly broad searches.
Priority 1 is highest, 5 is lowest.`),
      new HumanMessage(`DOCUMENTS IN VAULT:\n${docSummaries}`),
    ]);

    const queries = result.queries
      .sort((a: { priority: number }, b: { priority: number }) => a.priority - b.priority)
      .slice(0, 5)
      .map((q: { query: string }) => q.query);

    return { queries, vaultDocuments };
  } catch {
    return { queries: [], vaultDocuments };
  }
}

export async function executeSearches(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  if (state.queries.length === 0) {
    return { allResults: [], queriesUsed: [] };
  }

  const allResults: Array<TavilySearchResult & { sourceQuery: string }> = [];
  const queriesUsed: string[] = [];
  let queriesExecuted = 0;
  let urlsFetched = 0;

  for (const query of state.queries) {
    try {
      const resultsPerQuery = Math.ceil(state.maxResults / state.queries.length) + 5;
      const response = await executeTavilySearch(query, resultsPerQuery, 'basic');

      queriesUsed.push(query);
      queriesExecuted++;
      urlsFetched += response.results.length;

      for (const result of response.results) {
        allResults.push({ ...result, sourceQuery: query });
      }
    } catch {
      // Continue with other queries
    }
  }

  return {
    allResults,
    queriesUsed,
    counts: {
      queriesExecuted,
      urlsFetched,
      urlsFiltered: 0,
      proposalsCreated: 0,
    },
  };
}

export async function deduplicateUrls(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  if (state.allResults.length === 0) {
    return { dedupedResults: [] };
  }

  const allUrls = state.allResults.map((r) => r.url);
  const newUrls = await filterExistingUrls(allUrls);
  const newUrlSet = new Set(newUrls);
  const dedupedResults = state.allResults.filter((r) => newUrlSet.has(r.url));
  const urlsFiltered = state.allResults.length - dedupedResults.length;

  return {
    dedupedResults,
    counts: {
      ...state.counts,
      urlsFiltered,
    },
  };
}

export async function scoreResults(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  if (state.dedupedResults.length === 0) {
    return { scoredResults: [] };
  }

  const vaultContext =
    state.vaultDocuments.length > 0
      ? state.vaultDocuments.map((d) => `- ${d.title} (${d.tags.join(', ')})`).join('\n')
      : 'No existing documents';

  // Group by source query for better scoring
  const resultsByQuery = new Map<string, Array<TavilySearchResult & { sourceQuery: string }>>();
  for (const result of state.dedupedResults) {
    if (!resultsByQuery.has(result.sourceQuery)) {
      resultsByQuery.set(result.sourceQuery, []);
    }
    resultsByQuery.get(result.sourceQuery)!.push(result);
  }

  const scoredResults: ScoredResult[] = [];

  const model = createExtractionModel({ temperature: 0.3 }).withStructuredOutput(
    WebScoreResultsSchema
  );

  for (const [query, results] of resultsByQuery) {
    const resultsText = results
      .map((r, i) => `[${i}] "${r.title}"\nURL: ${r.url}\nExcerpt: ${r.content.slice(0, 500)}`)
      .join('\n\n');

    try {
      const response = await model.invoke([
        new SystemMessage(`You are evaluating web search results for relevance to a user's knowledge vault.

For each result, assess:
1. Relevance to the search query and user's existing knowledge
2. Content quality and depth
3. Content type classification

Content types: article, documentation, paper, tutorial, video, other
Relevance scores: 0.0 (irrelevant) to 1.0 (highly relevant)
Only include results with relevance >= ${state.minRelevanceScore}`),
        new HumanMessage(`SEARCH QUERY: "${query}"

USER'S VAULT CONTAINS:
${vaultContext}

SEARCH RESULTS:
${resultsText}`),
      ]);

      for (const score of response.scores) {
        if (
          score.index >= 0 &&
          score.index < results.length &&
          score.relevanceScore >= state.minRelevanceScore
        ) {
          scoredResults.push({
            ...results[score.index],
            relevanceScore: Math.min(Math.max(score.relevanceScore, 0), 1),
            relevanceReason: score.relevanceReason.slice(0, 300),
            contentType: score.contentType,
            topics: score.topics.slice(0, 5),
            sourceQuery: query,
          });
        }
      }
    } catch {
      // Fallback: use Tavily scores
      for (const r of results) {
        if (r.score >= state.minRelevanceScore) {
          scoredResults.push({
            ...r,
            relevanceScore: r.score,
            relevanceReason: 'Search match',
            contentType: 'other',
            topics: [],
            sourceQuery: query,
          });
        }
      }
    }
  }

  // Sort by relevance and limit
  scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topResults = scoredResults.slice(0, state.maxResults);

  return { scoredResults: topResults };
}

export async function createProposals(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  if (state.scoredResults.length === 0) {
    return { proposals: [], artifactIds: [] };
  }

  const proposals: WebScoutProposal[] = [];
  const artifactIds: string[] = [];
  let proposalsCreated = 0;

  for (const result of state.scoredResults) {
    const proposal: WebScoutProposal = {
      url: result.url,
      title: result.title,
      summary: result.content.slice(0, 500),
      relevanceReason: result.relevanceReason,
      relevanceScore: result.relevanceScore,
      contentType: result.contentType,
      topics: result.topics,
      sourceQuery: result.sourceQuery,
      excerpt: result.content.slice(0, 300),
    };

    proposals.push(proposal);

    try {
      const artifactId = await insertWebProposalArtifact({
        runId: state.runId ?? null,
        agent: 'webScout',
        kind: 'web-proposal',
        day: state.day,
        title: proposal.title,
        content: {
          url: proposal.url,
          summary: proposal.summary,
          relevanceReason: proposal.relevanceReason,
          relevanceScore: proposal.relevanceScore,
          contentType: proposal.contentType,
          topics: proposal.topics,
          sourceQuery: proposal.sourceQuery,
          excerpt: proposal.excerpt,
        },
        sourceRefs: { query: proposal.sourceQuery },
      });
      artifactIds.push(artifactId);
      proposalsCreated++;
    } catch {
      // Continue on error
    }
  }

  return {
    proposals,
    artifactIds,
    counts: {
      ...state.counts,
      proposalsCreated,
    },
  };
}
