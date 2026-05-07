import { insertReport } from '@/server/repos/report.repo';
import { publishReportToNotion } from '@/server/services/notionPublish.service';
import { synthesizeReport } from '@/server/services/report.service';
import { shouldSynthesize } from '@/server/flows/pipeline.policy';
import { appendPipelineFlowStep } from '@/server/flows/pipeline.trace';
import type {
  PipelinePersistPublishResult,
  PipelineStageContext,
  PipelineStageState,
  PipelineWebResearchResult,
} from '@/server/flows/pipeline.stageState';

export async function runPipelineReportStage(
  context: PipelineStageContext,
  state: PipelineStageState,
  webResearch: PipelineWebResearchResult,
  skipPublish: boolean,
): Promise<PipelinePersistPublishResult> {
  const reportContent = await synthesizePipelineReport(context, state, webResearch);
  let reportId: string | null = null;
  let notionPageId: string | null = null;

  await appendPipelineFlowStep(context.runId, {
    name: 'pipeline_persist_publish',
    status: 'running',
    input: {
      runMode: context.mode,
    },
  });

  if (reportContent) {
    try {
      reportId = await insertReport({
        workspaceId: context.workspaceId,
        runId: context.runId,
        day: context.resolved.day,
        title: reportContent.title,
        content: {
          ...reportContent,
          analysis: webResearch.analyzedFindings?.summary ?? null,
          counts: state.counts,
        },
        sourceRefs: {
          goal: context.resolved.goal,
          topicId: context.resolved.topic?.id ?? null,
          topicName: context.resolved.topic?.name ?? null,
          focusTags: webResearch.webScoutFocusTags,
          documentIds: context.resolved.documentIds,
          webProposalArtifactIds: state.artifacts.webProposalIds,
          analysisArtifactIds: state.artifacts.analysisArtifactIds,
          runMode: context.mode,
        },
      });
    } catch (persistError) {
      state.errors.push({
        stage: 'persist_publish',
        message: persistError instanceof Error ? persistError.message : String(persistError),
      });
    }

    if (reportId && !skipPublish) {
      const publishResult = await publishReportToNotion({
        title: reportContent.title,
        markdown: reportContent.markdown,
        day: context.resolved.day,
        topicName: context.resolved.topic?.name ?? null,
        reportId,
        runId: context.runId,
      });

      notionPageId = publishResult.pageId;

      if (!publishResult.published && !publishResult.skipped) {
        state.errors.push({
          stage: 'persist_publish',
          message: publishResult.error ?? 'Notion publication failed',
        });
      }
    }
  }

  await appendPipelineFlowStep(context.runId, {
    name: 'pipeline_persist_publish',
    status: 'ok',
    output: {
      reportId,
      notionPageId,
      analysisArtifactIds: state.artifacts.analysisArtifactIds,
    },
  });

  return {
    reportId,
    notionPageId,
  };
}

async function synthesizePipelineReport(
  context: PipelineStageContext,
  state: PipelineStageState,
  webResearch: PipelineWebResearchResult,
): Promise<Awaited<ReturnType<typeof synthesizeReport>> | null> {
  if (shouldSynthesize(context.mode) && webResearch.analyzedFindings && webResearch.analyzedFindings.evidence.length > 0) {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_synthesize',
      status: 'running',
    });

    try {
      const reportContent = await synthesizeReport(
        context.resolved.goal,
        webResearch.analyzedFindings,
        webResearch.webScoutFocusTags,
        context.runId,
      );
      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_synthesize',
        status: 'ok',
        output: {
          title: reportContent.title,
          sourcesCount: reportContent.sourcesCount,
        },
      });

      return reportContent;
    } catch (error) {
      state.errors.push({
        stage: 'synthesize',
        message: error instanceof Error ? error.message : String(error),
      });
      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_synthesize',
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  } else {
    await skipPipelineSynthesis(context, state);
  }

  return null;
}

async function skipPipelineSynthesis(
  context: PipelineStageContext,
  state: PipelineStageState,
): Promise<void> {
  if (shouldSynthesize(context.mode)) {
    const hasUpstreamFindingError = state.errors.some((error) => {
      return error.stage === 'webscout' || error.stage === 'analyze_findings';
    });

    if (!hasUpstreamFindingError) {
      state.errors.push({
        stage: 'synthesize',
        message: 'No analyzed findings available to synthesize into a report',
      });
    }
  }

  await appendPipelineFlowStep(context.runId, {
    name: 'pipeline_synthesize',
    status: 'skipped',
    output: {
      reason: shouldSynthesize(context.mode)
        ? 'Skipped because no analyzed findings were available'
        : 'Mode does not include report synthesis',
    },
  });
}
