/**
 * Node implementations for the WebScout ReAct agent.
 *
 * setup         - Build initial prompt sections and vault/watchlist context
 * agent         - Invoke OpenAI Responses API with function tools
 * executeTools  - Run tool calls, capture outputs, track structured state
 * finalize      - Convert quality results to proposals and save artifacts
 */
import type { EasyInputMessage } from 'openai/resources/responses/responses';
import { openAIExecutionService, type AIFunctionToolOutputInput } from '@/server/ai/openai-execution-service';
import { buildPrompt } from '@/server/ai/prompt-builder';
import { AI_TASKS } from '@/server/ai/tasks';
import {
  getRecentDocumentsForQuery,
  getDocumentsByTags,
  insertWebProposalArtifact,
} from '@/server/repos/webScout.repo';
import { checkoutDueSources } from '@/server/services/sourceWatch.service';
import {
  getWebScoutTool,
  webScoutToolDefinitions,
} from '@/server/ai/tools/webScout.tools';
import { ScoredResult, WebScoutProposal, WebScoutStateType } from './webScout.types';

interface SearchToolArgs {
  excludeDomains?: string[] | null;
  feedback?: string;
  goal?: string;
  includeDomains?: string[] | null;
  maxResults?: number | null;
  originalQuery?: string;
  query?: string;
  snippet?: string;
  title?: string;
  url?: string;
  urls?: string[];
}

function normalizeDomains(domains: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const domain of domains) {
    const clean = domain.trim().toLowerCase();
    if (!clean || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    normalized.push(clean);
  }
  return normalized;
}

function coerceSearchToolArgs(args: unknown): SearchToolArgs {
  if (!args || typeof args !== 'object') {
    return {};
  }

  return { ...(args as SearchToolArgs) };
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ---------- setup ----------

export async function setup(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  let vaultContext = '';
  let watchSourceDomains: string[] = [];
  let watchSourceLines = '';

  if (state.mode === 'derive-from-vault') {
    const docs = state.focusTags?.length
      ? await getDocumentsByTags(state.focusTags, 8)
      : await getRecentDocumentsForQuery(8);

    if (docs.length > 0) {
      vaultContext = docs
        .map((document) => {
          return `- "${document.title}" (tags: ${document.tags.join(', ') || 'none'})\n  ${document.content.slice(0, 200)}`;
        })
        .join('\n');
    }
  }

  try {
    const dueSources = await checkoutDueSources(8);
    if (dueSources.length > 0) {
      watchSourceDomains = normalizeDomains(dueSources.map((source) => source.domain));
      watchSourceLines = dueSources
        .map((source) => {
          return `- ${source.domain} (${source.kind}; every ${source.checkIntervalHours}h)`;
        })
        .join('\n');
    }
  } catch {
    // Watchlist errors should not block scouting.
  }

  const vaultSection = vaultContext
    ? `VAULT CONTEXT (user's existing documents):\n${vaultContext}\n\nUse this context to avoid suggesting resources the user already has and to find complementary material.`
    : 'VAULT CONTEXT:\nnone';
  const watchSourceSection = watchSourceLines
    ? `PERIODIC SOURCE WATCHLIST:\n${watchSourceLines}\nPrioritize these domains when relevant.`
    : 'PERIODIC SOURCE WATCHLIST:\nnone';
  const restrictDomainSection =
    state.restrictToWatchlistDomains && watchSourceDomains.length > 0
      ? 'TRUSTED SOURCE MODE: restrict search results to watchlist domains only.'
      : 'TRUSTED SOURCE MODE: disabled.';

  const prompt = buildPrompt({
    task: AI_TASKS.webResearchAgent,
    systemInstructions: [
      {
        heading: 'Role',
        content: 'You are a web research agent finding high-quality learning resources.',
      },
      {
        heading: 'Tools',
        content: [
          'searchWeb: search the web. Returns results with url, title, snippet, score, and optional publishedDate. Start here.',
          'checkVaultDuplicate: check which URLs already exist in the vault or were previously proposed/rejected.',
          'evaluateResult: score promising URLs for quality and relevance. Pass publishedDate when available.',
          'refineQuery: improve the search query when results are insufficient.',
        ].join('\n'),
      },
      {
        heading: 'Strategy',
        content: [
          '1. Search for resources related to the goal.',
          '2. Check found URLs against the vault to avoid duplicates and previously proposed/rejected URLs.',
          `3. Evaluate promising new results until you have at least ${state.minQualityResults} quality results with relevance >= ${state.minRelevanceScore}.`,
          '4. Vary your search queries across iterations: try different phrasings, synonyms, and sub-topics.',
          '5. After 2+ searches with similar results, try a fundamentally different angle (tutorials vs papers vs documentation vs case studies).',
          '6. Use specific technical terms rather than repeating the high-level goal verbatim.',
          '7. Refine the query and search again if needed.',
          '8. When satisfied, respond with a short summary and no tool calls.',
          '9. If watchlist sources are present, prioritize them first.',
          '10. If trusted source mode is enabled, only use watchlist domains in searchWeb includeDomains.',
        ].join('\n'),
      },
      {
        heading: 'Constraints',
        content: `Always pass the goal parameter as "${state.goal}" when calling evaluateResult. Include publishedDate in evaluateResult when the search result has one.`,
      },
    ],
    sharedContext: [
      {
        heading: 'Goal',
        content: state.goal,
      },
      {
        heading: 'Quality Bar',
        content: `Find at least ${state.minQualityResults} results with relevance >= ${state.minRelevanceScore}.`,
      },
      ...(state.focusTags?.length
        ? [
            {
              heading: 'Topic Tags',
              content: `Use these keywords to craft varied search queries: ${state.focusTags.join(', ')}`,
            },
          ]
        : []),
      {
        heading: 'Vault Context',
        content: vaultSection,
      },
      {
        heading: 'Watchlist Context',
        content: `${watchSourceSection}\n${restrictDomainSection}`,
      },
    ],
    inputMessages: [
      {
        role: 'user',
        content:
          state.mode === 'derive-from-vault'
            ? `Find high-quality web resources that complement the user's vault. Goal: ${state.goal}`
            : `Find high-quality web resources about: ${state.goal}`,
      },
    ],
  });

  return {
    initialInput: prompt.input as EasyInputMessage[],
    instructions: prompt.instructions,
    promptCacheKey: prompt.promptCacheKey,
    vaultContext,
    watchSourceDomains,
    previousResponseId: null,
    pendingToolOutputs: [],
    lastAgentResult: null,
  };
}

// ---------- agent ----------

export async function agent(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const prompt = {
    instructions: state.instructions,
    promptCacheKey: state.promptCacheKey,
    input: state.initialInput,
    requestPayload: '',
    stablePrefix: state.instructions,
  };

  const input = state.previousResponseId ? state.pendingToolOutputs : state.initialInput;
  const response = await openAIExecutionService.executeToolRound({
    task: AI_TASKS.webResearchAgent,
    prompt,
    input,
    previousResponseId: state.previousResponseId,
    tools: webScoutToolDefinitions,
    attribution: {
      jobId: state.runId,
    },
  });

  return {
    lastAgentResult: response,
    previousResponseId: response.responseId,
    pendingToolOutputs: [],
    iteration: state.iteration + 1,
  };
}

// ---------- executeTools ----------

export async function executeTools(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const toolCalls = state.lastAgentResult?.toolCalls ?? [];
  if (toolCalls.length === 0) {
    return {};
  }

  const toolOutputs: AIFunctionToolOutputInput[] = [];
  let queriesExecuted = state.queriesExecuted;
  const qualityResults = [...state.qualityResults];

  for (const call of toolCalls) {
    const tool = getWebScoutTool(call.name);
    if (!tool) {
      toolOutputs.push({
        type: 'function_call_output',
        call_id: call.callId,
        output: `Unknown tool: ${call.name}`,
      });
      continue;
    }

    try {
      const toolArgs = coerceSearchToolArgs(call.arguments);
      if (
        call.name === 'searchWeb' &&
        state.restrictToWatchlistDomains &&
        state.watchSourceDomains.length > 0
      ) {
        toolArgs.includeDomains = state.watchSourceDomains;
      }

      const result = await tool.execute(toolArgs);
      toolOutputs.push({
        type: 'function_call_output',
        call_id: call.callId,
        output: result,
      });

      if (call.name === 'searchWeb') {
        queriesExecuted += 1;
      }

      if (call.name === 'evaluateResult') {
        const parsed = safeParseJson(result);
        if (!parsed || typeof parsed !== 'object') {
          continue;
        }

        const parsedRecord = parsed as Record<string, unknown>;
        const relevanceScore = parsedRecord.relevanceScore;
        if (typeof relevanceScore !== 'number' || relevanceScore < state.minRelevanceScore) {
          continue;
        }

        const url = typeof toolArgs.url === 'string' ? toolArgs.url : '';
        if (!url) {
          continue;
        }

        qualityResults.push({
          url,
          title: typeof toolArgs.title === 'string' ? toolArgs.title : 'Untitled',
          snippet: typeof toolArgs.snippet === 'string' ? toolArgs.snippet : '',
          relevanceScore,
          contentType:
            typeof parsedRecord.contentType === 'string'
              ? (parsedRecord.contentType as ScoredResult['contentType'])
              : 'other',
          topics: Array.isArray(parsedRecord.topics)
            ? parsedRecord.topics.filter((topic): topic is string => typeof topic === 'string')
            : [],
          reasoning:
            typeof parsedRecord.reasoning === 'string' ? [parsedRecord.reasoning] : [''],
        });
      }
    } catch (error) {
      toolOutputs.push({
        type: 'function_call_output',
        call_id: call.callId,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return {
    pendingToolOutputs: toolOutputs,
    queriesExecuted,
    qualityResults,
  };
}

// ---------- finalize ----------

export async function finalize(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const seen = new Set<string>();
  const uniqueResults: ScoredResult[] = [];
  for (const result of state.qualityResults) {
    if (!seen.has(result.url)) {
      seen.add(result.url);
      uniqueResults.push(result);
    }
  }
  uniqueResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const proposals: WebScoutProposal[] = [];
  const artifactIds: string[] = [];
  const reasoning: string[] = [];

  for (const result of uniqueResults) {
    const proposal: WebScoutProposal = {
      url: result.url,
      title: result.title,
      summary: result.snippet,
      relevanceScore: result.relevanceScore,
      contentType: result.contentType,
      topics: result.topics,
      reasoning: result.reasoning,
    };
    proposals.push(proposal);
    reasoning.push(...result.reasoning);

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
          relevanceScore: proposal.relevanceScore,
          contentType: proposal.contentType,
          topics: proposal.topics,
          reasoning: proposal.reasoning,
        },
        sourceRefs: { goal: state.goal, watchSourceDomains: state.watchSourceDomains },
      });
      artifactIds.push(artifactId);
    } catch {
      // Continue on artifact save error
    }
  }

  let terminationReason = state.terminationReason;
  if (!terminationReason) {
    const hasEnoughQuality = uniqueResults.length >= state.minQualityResults;
    if (hasEnoughQuality) {
      terminationReason = 'satisfied';
    } else if (state.queriesExecuted >= state.maxQueries) {
      terminationReason = 'max_queries';
    } else {
      terminationReason = 'max_iterations';
    }
  }

  return {
    proposals,
    artifactIds,
    reasoning,
    terminationReason,
    counts: {
      iterations: state.iteration,
      queriesExecuted: state.queriesExecuted,
      resultsEvaluated: state.qualityResults.length,
      proposalsCreated: proposals.length,
    },
  };
}
