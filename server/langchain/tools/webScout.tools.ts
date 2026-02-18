/**
 * Tools for the WebScout ReAct agent.
 *
 * searchWeb       – Tavily search wrapper
 * evaluateResult  – Hybrid heuristic + LLM scoring
 * checkVaultDuplicate – Check URLs against existing documents
 * refineQuery     – LLM-guided query refinement
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { executeTavilySearch } from '@/server/langchain/tools/tavily.tool';
import { filterExistingUrls } from '@/server/repos/webScout.repo';
import { createExtractionModel } from '@/server/langchain/models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { EvaluationResultSchema } from '@/server/langchain/schemas/webScore.schema';

// ---------- Domain quality heuristic ----------

const HIGH_QUALITY_DOMAINS = new Set([
  'arxiv.org', 'github.com', 'stackoverflow.com', 'wikipedia.org',
  'nature.com', 'sciencedirect.com', 'acm.org', 'ieee.org',
  'mit.edu', 'stanford.edu', 'harvard.edu', 'berkeley.edu',
  'medium.com', 'dev.to', 'towardsdatascience.com',
]);

const LOW_QUALITY_DOMAINS = new Set([
  'pinterest.com', 'facebook.com', 'twitter.com', 'x.com',
  'tiktok.com', 'instagram.com', 'reddit.com',
]);

function domainOf(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function computeHeuristicScore(url: string, title: string, snippet: string, goal: string): number {
  let score = 0.5;

  const domain = domainOf(url);
  if (HIGH_QUALITY_DOMAINS.has(domain) || domain.endsWith('.edu') || domain.endsWith('.gov')) {
    score += 0.2;
  }
  if (LOW_QUALITY_DOMAINS.has(domain)) {
    score -= 0.3;
  }

  const goalWords = goal.toLowerCase().split(/\s+/);
  const titleLower = title.toLowerCase();
  const snippetLower = snippet.toLowerCase();
  const matchCount = goalWords.filter(w => titleLower.includes(w) || snippetLower.includes(w)).length;
  const matchRatio = goalWords.length > 0 ? matchCount / goalWords.length : 0;
  score += matchRatio * 0.3;

  return Math.max(0, Math.min(1, score));
}

// ---------- Tools ----------

export const searchWebTool = tool(
  async ({ query, maxResults }) => {
    const response = await executeTavilySearch(query, maxResults ?? 8, 'basic');
    const results = response.results.map(r => ({
      url: r.url,
      title: r.title,
      snippet: r.content.slice(0, 500),
      score: r.score,
    }));
    return JSON.stringify(results);
  },
  {
    name: 'searchWeb',
    description:
      'Search the web for resources. Returns JSON array of { url, title, snippet, score }.',
    schema: z.object({
      query: z.string().describe('Search query'),
      maxResults: z.number().nullable().describe('Max results to return. Use null for default (8).'),
    }),
  },
);

export const evaluateResultTool = tool(
  async ({ url, title, snippet, goal }) => {
    const heuristic = computeHeuristicScore(url, title, snippet, goal);

    // Fast path: clearly good or clearly bad
    if (heuristic > 0.7) {
      return JSON.stringify({
        relevanceScore: heuristic,
        contentType: 'article',
        topics: [],
        reasoning: `High-quality domain and strong keyword match (heuristic: ${heuristic.toFixed(2)})`,
      });
    }
    if (heuristic < 0.4) {
      return JSON.stringify({
        relevanceScore: heuristic,
        contentType: 'other',
        topics: [],
        reasoning: `Low-quality domain or weak keyword match (heuristic: ${heuristic.toFixed(2)})`,
      });
    }

    // Borderline: use LLM for nuanced evaluation
    try {
      const model = createExtractionModel({ temperature: 0.2 }).withStructuredOutput(
        EvaluationResultSchema,
      );
      const result = await model.invoke([
        new SystemMessage(
          `Evaluate this web resource for relevance to the user's learning goal.
Score from 0.0 (irrelevant) to 1.0 (highly relevant).
Classify content type: article, documentation, paper, tutorial, video, or other.
Extract up to 5 topic tags.`,
        ),
        new HumanMessage(
          `GOAL: ${goal}\n\nURL: ${url}\nTITLE: ${title}\nSNIPPET: ${snippet}`,
        ),
      ]);
      return JSON.stringify(result);
    } catch {
      // Fallback to heuristic on LLM failure
      return JSON.stringify({
        relevanceScore: heuristic,
        contentType: 'other',
        topics: [],
        reasoning: `LLM evaluation failed, using heuristic (${heuristic.toFixed(2)})`,
      });
    }
  },
  {
    name: 'evaluateResult',
    description:
      'Score a single web result for relevance to the goal. Returns { relevanceScore, contentType, topics, reasoning }.',
    schema: z.object({
      url: z.string().describe('URL of the result'),
      title: z.string().describe('Title of the result'),
      snippet: z.string().describe('Content snippet from the result'),
      goal: z.string().describe('The learning goal to evaluate against'),
    }),
  },
);

export const checkVaultDuplicateTool = tool(
  async ({ urls }) => {
    const newUrls = await filterExistingUrls(urls);
    const existingUrls = urls.filter(u => !newUrls.includes(u));
    return JSON.stringify({ newUrls, existingUrls });
  },
  {
    name: 'checkVaultDuplicate',
    description:
      'Check which URLs already exist in the user\'s vault. Returns { newUrls, existingUrls }.',
    schema: z.object({
      urls: z.array(z.string()).describe('URLs to check for duplicates'),
    }),
  },
);

export const refineQueryTool = tool(
  async ({ originalQuery, feedback }) => {
    try {
      const model = createExtractionModel({ temperature: 0.4 });
      const response = await model.invoke([
        new SystemMessage(
          'You are a search query optimizer. Given the original query and feedback about what is missing from results, produce a single improved search query. Reply with ONLY the refined query string, no explanation.',
        ),
        new HumanMessage(
          `Original query: ${originalQuery}\nFeedback: ${feedback}`,
        ),
      ]);
      const content = typeof response.content === 'string'
        ? response.content.trim()
        : String(response.content).trim();
      return content || originalQuery;
    } catch {
      return originalQuery;
    }
  },
  {
    name: 'refineQuery',
    description:
      'Modify a search query based on feedback about what is missing from current results. Returns a refined query string.',
    schema: z.object({
      originalQuery: z.string().describe('The original search query'),
      feedback: z.string().describe('What is missing from current results'),
    }),
  },
);

export const webScoutTools = [
  searchWebTool,
  evaluateResultTool,
  checkVaultDuplicateTool,
  refineQueryTool,
];
