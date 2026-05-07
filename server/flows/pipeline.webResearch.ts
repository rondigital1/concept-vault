import { webScoutGraph } from '@/server/agents/webScout.graph';
import { appendStep } from '@/server/observability/runTrace.store';
import { insertArtifact } from '@/server/repos/artifacts.repo';
import { analyzeFindings } from '@/server/services/analyzeFindings.service';
import { shouldRunWebScout } from '@/server/flows/pipeline.policy';
import { normalizePipelineTags } from '@/server/flows/pipeline.targets';
import { appendPipelineFlowStep } from '@/server/flows/pipeline.trace';
import type {
  PipelineStageContext,
  PipelineStageState,
  PipelineWebResearchResult,
} from '@/server/flows/pipeline.stageState';

export async function runPipelineWebResearchStage(
  context: PipelineStageContext,
  state: PipelineStageState,
  curateTags: string[],
): Promise<PipelineWebResearchResult> {
  const webScoutFocusTags = normalizePipelineTags(curateTags).slice(0, 20);
  let webScoutResult: Awaited<ReturnType<typeof webScoutGraph>> | null = null;
  let analyzedFindings: PipelineWebResearchResult['analyzedFindings'] = null;

  if (shouldRunWebScout(context.mode)) {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_webscout',
      status: 'running',
      input: {
        goal: context.resolved.goal,
        focusTags: webScoutFocusTags,
        mode: context.resolved.mode,
      },
    });

    try {
      webScoutResult = await webScoutGraph(
        {
          workspaceId: context.workspaceId,
          goal: context.resolved.goal,
          mode: context.resolved.mode,
          day: context.resolved.day,
          focusTags: webScoutFocusTags.length > 0 ? webScoutFocusTags : undefined,
          minQualityResults: context.resolved.minQualityResults,
          minRelevanceScore: context.resolved.minRelevanceScore,
          maxIterations: context.resolved.maxIterations,
          maxQueries: context.resolved.maxQueries,
          restrictToWatchlistDomains: false,
        },
        async (agentStep) => {
          await appendStep(context.runId, agentStep);
        },
        context.runId,
      );

      state.counts.webProposals = webScoutResult.counts.proposalsCreated;
      state.artifacts.webProposalIds = webScoutResult.artifactIds;

      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_webscout',
        status: 'ok',
        output: {
          counts: webScoutResult.counts,
          terminationReason: webScoutResult.terminationReason,
        },
      });
    } catch (error) {
      state.errors.push({
        stage: 'webscout',
        message: error instanceof Error ? error.message : String(error),
      });
      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_webscout',
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }

    analyzedFindings = await analyzeWebScoutFindings(context, state, webScoutResult);
  } else {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_webscout',
      status: 'skipped',
      output: { reason: 'Mode does not include web scouting' },
    });

    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_analyze_findings',
      status: 'skipped',
      output: { reason: 'Mode does not include web scouting' },
    });
  }

  return {
    webScoutFocusTags,
    analyzedFindings,
  };
}

async function analyzeWebScoutFindings(
  context: PipelineStageContext,
  state: PipelineStageState,
  webScoutResult: Awaited<ReturnType<typeof webScoutGraph>> | null,
): Promise<PipelineWebResearchResult['analyzedFindings']> {
  if (webScoutResult && webScoutResult.proposals.length > 0) {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_analyze_findings',
      status: 'running',
      input: {
        proposals: webScoutResult.proposals.length,
      },
    });

    const analyzedFindings = analyzeFindings(webScoutResult.proposals);
    state.counts.analyzedEvidence = analyzedFindings.summary.uniqueEvidence;

    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_analyze_findings',
      status: 'ok',
      output: analyzedFindings.summary,
    });

    try {
      const analysisArtifactId = await insertArtifact({
        workspaceId: context.workspaceId,
        runId: context.runId,
        agent: 'research',
        kind: 'web-analysis',
        day: context.resolved.day,
        title: `Analyzed findings: ${context.resolved.goal.slice(0, 120)}`,
        content: {
          summary: analyzedFindings.summary,
          clusters: analyzedFindings.clusters,
          evidence: analyzedFindings.evidence.slice(0, 20),
        },
        sourceRefs: {
          topicId: context.resolved.topic?.id ?? null,
          goal: context.resolved.goal,
          runMode: context.mode,
          webProposalArtifactIds: state.artifacts.webProposalIds,
        },
      });
      state.artifacts.analysisArtifactIds.push(analysisArtifactId);
    } catch (analysisError) {
      state.errors.push({
        stage: 'analyze_findings',
        message: analysisError instanceof Error ? analysisError.message : String(analysisError),
      });
    }

    return analyzedFindings;
  }

  const noProposalReason = webScoutResult
    ? `WebScout produced no proposals meeting relevance >= ${context.resolved.minRelevanceScore} (termination: ${webScoutResult.terminationReason ?? 'unknown'})`
    : 'No WebScout proposals available for analysis';

  if (webScoutResult) {
    state.errors.push({
      stage: 'webscout',
      message: noProposalReason,
    });
  }

  await appendPipelineFlowStep(context.runId, {
    name: 'pipeline_analyze_findings',
    status: 'skipped',
    output: { reason: noProposalReason },
  });

  return null;
}
