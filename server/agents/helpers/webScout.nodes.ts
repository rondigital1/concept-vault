/**
 * Node implementations for the WebScout ReAct agent.
 *
 * setup         – Build initial messages (system prompt + goal + vault context)
 * agent         – Invoke LLM with tools bound
 * executeTools  – Run tool calls, track structured state
 * finalize      – Convert quality results to proposals and save artifacts
 */
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import { createChatModel } from '@/server/langchain/models';
import {
  getRecentDocumentsForQuery,
  getDocumentsByTags,
  insertWebProposalArtifact,
} from '@/server/repos/webScout.repo';
import { checkoutDueSources } from '@/server/services/sourceWatch.service';
import { webScoutTools } from '@/server/langchain/tools/webScout.tools';
import { ScoredResult, WebScoutProposal, WebScoutStateType } from './webScout.types';

// ---------- setup ----------

export async function setup(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  let vaultContext = '';
  let watchSourceDomains: string[] = [];
  let watchSourceLines = '';

  if (state.mode === 'derive-from-vault') {
    const docs = state.focusTags?.length
      ? await getDocumentsByTags(state.focusTags, 5)
      : await getRecentDocumentsForQuery(5);

    if (docs.length > 0) {
      vaultContext = docs
        .map(d => `- "${d.title}" (tags: ${d.tags.join(', ') || 'none'})\n  ${d.content.slice(0, 300)}`)
        .join('\n');
    }
  }

  try {
    const dueSources = await checkoutDueSources(8);
    if (dueSources.length > 0) {
      watchSourceDomains = dueSources.map((source) => source.domain);
      watchSourceLines = dueSources
        .map((source) => `- ${source.domain} (${source.kind}; every ${source.checkIntervalHours}h)`)
        .join('\n');
    }
  } catch {
    // Watchlist errors should not block scouting.
  }

  const vaultSection = vaultContext
    ? `\nVAULT CONTEXT (user's existing documents):\n${vaultContext}\n\nUse this context to avoid suggesting resources the user already has and to find complementary material.`
    : '';
  const watchSourceSection = watchSourceLines
    ? `\nPERIODIC SOURCE WATCHLIST (check these first when relevant):\n${watchSourceLines}\n`
    : '';

  const systemPrompt = `You are a web research agent finding high-quality learning resources.

GOAL: ${state.goal}
${vaultSection}
${watchSourceSection}
TOOLS:
- searchWeb: Search the web. Start here.
- checkVaultDuplicate: Check which URLs are already in the user's vault. Call after searching.
- evaluateResult: Score a result for relevance. Call on promising new URLs.
- refineQuery: Get a better query when results are insufficient.

STRATEGY:
1. Search for resources related to the goal
2. Check found URLs against the vault to avoid duplicates
3. Evaluate promising new results for quality and relevance
4. If you have fewer than ${state.minQualityResults} quality results (score >= ${state.minRelevanceScore}), refine your query and search again
5. When satisfied, respond with a summary of what you found WITHOUT calling any tools
6. If watchlist sources are present, prioritize queries constrained to those domains first (for example, include site:domain in your query)

QUALITY BAR: Find at least ${state.minQualityResults} results with relevance >= ${state.minRelevanceScore}.
IMPORTANT: When calling evaluateResult, always pass the goal parameter as "${state.goal}".`;

  const baseHumanMessage = state.mode === 'derive-from-vault'
    ? `Find high-quality web resources that complement the user's vault. Goal: ${state.goal}`
    : `Find high-quality web resources about: ${state.goal}`;
  const watchSourceHint = watchSourceDomains.length > 0
    ? `Start by checking recent interesting resources from these watched domains: ${watchSourceDomains.join(', ')}.`
    : '';
  const humanMessage = watchSourceHint
    ? `${baseHumanMessage}\n${watchSourceHint}`
    : baseHumanMessage;

  return {
    messages: [new SystemMessage(systemPrompt), new HumanMessage(humanMessage)],
    vaultContext,
    watchSourceDomains,
  };
}

// ---------- agent ----------

export async function agent(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const model = createChatModel({ temperature: 0.3 }).bindTools!(webScoutTools);
  const response = await model.invoke(state.messages);

  return {
    messages: [...state.messages, response],
    iteration: state.iteration + 1,
  };
}

// ---------- executeTools ----------

export async function executeTools(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!(lastMessage instanceof AIMessage) || !lastMessage.tool_calls?.length) {
    return {};
  }

  const toolsByName = new Map<string, StructuredToolInterface>(
    webScoutTools.map(t => [t.name, t as StructuredToolInterface]),
  );
  const toolMessages: ToolMessage[] = [];
  let queriesExecuted = state.queriesExecuted;
  const qualityResults = [...state.qualityResults];

  for (const call of lastMessage.tool_calls) {
    const toolFn = toolsByName.get(call.name);
    if (!toolFn) {
      toolMessages.push(new ToolMessage({
        tool_call_id: call.id!,
        content: `Unknown tool: ${call.name}`,
      }));
      continue;
    }

    try {
      const result = await toolFn.invoke(call.args);
      toolMessages.push(new ToolMessage({
        tool_call_id: call.id!,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      }));

      // Track side effects
      if (call.name === 'searchWeb') {
        queriesExecuted++;
      }

      if (call.name === 'evaluateResult') {
        const parsed = JSON.parse(typeof result === 'string' ? result : JSON.stringify(result));
        if (parsed.relevanceScore >= state.minRelevanceScore) {
          qualityResults.push({
            url: call.args.url,
            title: call.args.title,
            snippet: call.args.snippet,
            relevanceScore: parsed.relevanceScore,
            contentType: parsed.contentType ?? 'other',
            topics: parsed.topics ?? [],
            reasoning: [parsed.reasoning ?? ''],
          });
        }
      }
    } catch (err) {
      toolMessages.push(new ToolMessage({
        tool_call_id: call.id!,
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }

  return {
    messages: [...state.messages, ...toolMessages],
    queriesExecuted,
    qualityResults,
  };
}

// ---------- finalize ----------

export async function finalize(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  // Deduplicate quality results by URL
  const seen = new Set<string>();
  const uniqueResults: ScoredResult[] = [];
  for (const r of state.qualityResults) {
    if (!seen.has(r.url)) {
      seen.add(r.url);
      uniqueResults.push(r);
    }
  }

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

  // Determine termination reason from what the routing logic set or default
  let terminationReason = state.terminationReason;
  if (!terminationReason) {
    const hasEnoughQuality = uniqueResults.length >= state.minQualityResults;
    terminationReason = hasEnoughQuality ? 'satisfied' : 'max_iterations';
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
