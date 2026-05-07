import type { AIFunctionToolOutputInput } from '@/server/ai/openai-execution-service';
import { getWebScoutTool } from '@/server/ai/tools/webScout.tools';
import type { ScoredResult, WebScoutStateType } from '@/server/agents/helpers/webScout.types';

interface WebScoutToolArgs {
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

function coerceWebScoutToolArgs(args: unknown): WebScoutToolArgs {
  if (!args || typeof args !== 'object') {
    return {};
  }

  return { ...(args as WebScoutToolArgs) };
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

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
      const toolArgs = coerceWebScoutToolArgs(call.arguments);
      if (
        call.name === 'searchWeb' &&
        state.restrictToWatchlistDomains &&
        state.watchSourceDomains.length > 0
      ) {
        toolArgs.includeDomains = state.watchSourceDomains;
      }

      const result = await tool.execute(toolArgs, { workspaceId: state.workspaceId });
      toolOutputs.push({
        type: 'function_call_output',
        call_id: call.callId,
        output: result,
      });

      if (call.name === 'searchWeb') {
        queriesExecuted += 1;
      }

      if (call.name === 'evaluateResult') {
        appendQualityResult({
          minRelevanceScore: state.minRelevanceScore,
          qualityResults,
          result,
          toolArgs,
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

function appendQualityResult(params: {
  minRelevanceScore: number;
  qualityResults: ScoredResult[];
  result: string;
  toolArgs: WebScoutToolArgs;
}): void {
  const parsed = safeParseJson(params.result);
  if (!parsed || typeof parsed !== 'object') {
    return;
  }

  const parsedRecord = parsed as Record<string, unknown>;
  const relevanceScore = parsedRecord.relevanceScore;
  if (typeof relevanceScore !== 'number' || relevanceScore < params.minRelevanceScore) {
    return;
  }

  const url = typeof params.toolArgs.url === 'string' ? params.toolArgs.url : '';
  if (!url) {
    return;
  }

  params.qualityResults.push({
    url,
    title: typeof params.toolArgs.title === 'string' ? params.toolArgs.title : 'Untitled',
    snippet: typeof params.toolArgs.snippet === 'string' ? params.toolArgs.snippet : '',
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
