import { insertWebProposalArtifact } from '@/server/repos/webScout.repo';
import type { ScoredResult, WebScoutProposal, WebScoutStateType } from '@/server/agents/helpers/webScout.types';

export async function finalize(state: WebScoutStateType): Promise<Partial<WebScoutStateType>> {
  const uniqueResults = dedupeQualityResults(state.qualityResults);
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
        workspaceId: state.workspaceId,
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
      // Continue on artifact save error.
    }
  }

  return {
    proposals,
    artifactIds,
    reasoning,
    terminationReason: resolveTerminationReason(state, uniqueResults),
    counts: {
      iterations: state.iteration,
      queriesExecuted: state.queriesExecuted,
      resultsEvaluated: state.qualityResults.length,
      proposalsCreated: proposals.length,
    },
  };
}

function dedupeQualityResults(results: ScoredResult[]): ScoredResult[] {
  const seen = new Set<string>();
  const uniqueResults: ScoredResult[] = [];

  for (const result of results) {
    if (!seen.has(result.url)) {
      seen.add(result.url);
      uniqueResults.push(result);
    }
  }

  uniqueResults.sort((left, right) => right.relevanceScore - left.relevanceScore);
  return uniqueResults;
}

function resolveTerminationReason(
  state: WebScoutStateType,
  uniqueResults: ScoredResult[],
): WebScoutStateType['terminationReason'] {
  if (state.terminationReason) {
    return state.terminationReason;
  }

  const hasEnoughQuality = uniqueResults.length >= state.minQualityResults;
  if (hasEnoughQuality) {
    return 'satisfied';
  }

  if (state.queriesExecuted >= state.maxQueries) {
    return 'max_queries';
  }

  return 'max_iterations';
}
