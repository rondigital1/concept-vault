import { z } from 'zod';
import type { AIToolDefinition } from '@/server/ai/openai-execution-service';
import { openAIExecutionService } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import { executeTavilySearch } from '@/server/langchain/tools/tavily.tool';
import { EvaluationResultSchema } from '@/server/langchain/schemas/webScore.schema';
import { filterExistingUrls } from '@/server/repos/webScout.repo';

interface WebScoutTool {
  definition: AIToolDefinition;
  execute(args: unknown): Promise<string>;
}

const HIGH_QUALITY_DOMAINS = new Set([
  'arxiv.org',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'nature.com',
  'sciencedirect.com',
  'acm.org',
  'ieee.org',
  'mit.edu',
  'stanford.edu',
  'harvard.edu',
  'berkeley.edu',
  'medium.com',
  'dev.to',
  'towardsdatascience.com',
]);

const LOW_QUALITY_DOMAINS = new Set([
  'pinterest.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'instagram.com',
  'reddit.com',
]);

export const searchWebArgsSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(20).nullable(),
  includeDomains: z.array(z.string()).nullable().optional(),
  excludeDomains: z.array(z.string()).nullable().optional(),
});

export const evaluateResultArgsSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  snippet: z.string(),
  goal: z.string().min(1),
});

export const checkVaultDuplicateArgsSchema = z.object({
  urls: z.array(z.string().url()).min(1),
});

export const refineQueryArgsSchema = z.object({
  originalQuery: z.string().min(1),
  feedback: z.string().min(1),
});

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
  const matchCount = goalWords.filter((word) => {
    return titleLower.includes(word) || snippetLower.includes(word);
  }).length;
  const matchRatio = goalWords.length > 0 ? matchCount / goalWords.length : 0;
  score += matchRatio * 0.3;

  return Math.max(0, Math.min(1, score));
}

function clampMaxResults(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 8;
  }

  return Math.max(1, Math.min(Math.floor(value), 20));
}

async function searchWebTool(args: unknown): Promise<string> {
  const parsed = searchWebArgsSchema.parse(args);
  const response = await executeTavilySearch(parsed.query, clampMaxResults(parsed.maxResults), 'basic', {
    includeDomains: parsed.includeDomains ?? undefined,
    excludeDomains: parsed.excludeDomains ?? undefined,
  });
  const results = response.results.map((result) => ({
    url: result.url,
    title: result.title,
    snippet: result.content.slice(0, 500),
    score: result.score,
  }));

  return JSON.stringify(results);
}

async function evaluateResultTool(args: unknown): Promise<string> {
  const parsed = evaluateResultArgsSchema.parse(args);
  const heuristic = computeHeuristicScore(parsed.url, parsed.title, parsed.snippet, parsed.goal);

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

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.compareDocuments,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'Evaluate a web resource for relevance to the user goal.',
        },
        {
          heading: 'Requirements',
          content: [
            'Score relevance from 0.0 to 1.0.',
            'Classify the content type as article, documentation, paper, tutorial, video, or other.',
            'Extract up to 5 topic tags.',
            'Keep the reasoning concise.',
          ].join('\n'),
        },
      ],
      requestPayload: [
        {
          heading: 'Goal',
          content: parsed.goal,
        },
        {
          heading: 'Candidate',
          content: `URL: ${parsed.url}\nTITLE: ${parsed.title}\nSNIPPET: ${parsed.snippet}`,
        },
      ],
    });
    const response = await openAIExecutionService.executeStructured({
      task: AI_TASKS.compareDocuments,
      prompt,
      schema: EvaluationResultSchema,
      schemaName: 'web_result_evaluation',
    });
    return JSON.stringify(response.output);
  } catch {
    return JSON.stringify({
      relevanceScore: heuristic,
      contentType: 'other',
      topics: [],
      reasoning: `LLM evaluation failed, using heuristic (${heuristic.toFixed(2)})`,
    });
  }
}

async function checkVaultDuplicateTool(args: unknown): Promise<string> {
  const parsed = checkVaultDuplicateArgsSchema.parse(args);
  const newUrls = await filterExistingUrls(parsed.urls);
  const existingUrls = parsed.urls.filter((url) => {
    return !newUrls.includes(url);
  });

  return JSON.stringify({ newUrls, existingUrls });
}

async function refineQueryTool(args: unknown): Promise<string> {
  const parsed = refineQueryArgsSchema.parse(args);

  try {
    const prompt = buildPrompt({
      task: AI_TASKS.rewriteQuery,
      systemInstructions: [
        {
          heading: 'Role',
          content: 'You improve a search query based on missing-result feedback.',
        },
        {
          heading: 'Rules',
          content: 'Return only one refined query string with no explanation.',
        },
      ],
      requestPayload: [
        {
          heading: 'Original Query',
          content: parsed.originalQuery,
        },
        {
          heading: 'Feedback',
          content: parsed.feedback,
        },
      ],
    });
    const response = await openAIExecutionService.executeText({
      task: AI_TASKS.rewriteQuery,
      prompt,
    });
    return response.output || parsed.originalQuery;
  } catch {
    return parsed.originalQuery;
  }
}

export const webScoutTools: WebScoutTool[] = [
  {
    definition: {
      name: 'searchWeb',
      description:
        'Search the web for resources. Returns a JSON array of { url, title, snippet, score }.',
      schema: searchWebArgsSchema,
    },
    execute: searchWebTool,
  },
  {
    definition: {
      name: 'checkVaultDuplicate',
      description:
        "Check which URLs already exist in the user's vault. Returns { newUrls, existingUrls }.",
      schema: checkVaultDuplicateArgsSchema,
    },
    execute: checkVaultDuplicateTool,
  },
  {
    definition: {
      name: 'evaluateResult',
      description:
        'Score a web result for relevance to the goal. Returns { relevanceScore, contentType, topics, reasoning }.',
      schema: evaluateResultArgsSchema,
    },
    execute: evaluateResultTool,
  },
  {
    definition: {
      name: 'refineQuery',
      description:
        'Modify a search query based on feedback about what is missing from current results.',
      schema: refineQueryArgsSchema,
    },
    execute: refineQueryTool,
  },
];

const webScoutToolsByName = new Map<string, WebScoutTool>(
  webScoutTools.map((tool) => [tool.definition.name, tool]),
);

export const webScoutToolDefinitions = webScoutTools.map((tool) => tool.definition);

export function getWebScoutTool(name: string): WebScoutTool | undefined {
  return webScoutToolsByName.get(name);
}
