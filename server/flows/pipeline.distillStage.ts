import { distillerGraph } from '@/server/agents/distiller.graph';
import { appendStep } from '@/server/observability/runTrace.store';
import { splitDistillerArtifactIds } from '@/server/flows/pipeline.artifacts';
import { shouldRunDistill } from '@/server/flows/pipeline.policy';
import { appendPipelineFlowStep } from '@/server/flows/pipeline.trace';
import type { PipelineStageContext, PipelineStageState } from '@/server/flows/pipeline.stageState';

export async function runPipelineDistillStage(
  context: PipelineStageContext,
  state: PipelineStageState,
): Promise<void> {
  if (shouldRunDistill(context.mode, context.input.enableAutoDistill === true) && context.resolved.documentIds.length > 0) {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_distill',
      status: 'running',
      input: {
        day: context.resolved.day,
        documentIds: context.resolved.documentIds,
        limit: context.resolved.limit,
      },
    });

    try {
      const distillResult = await distillerGraph(
        {
          workspaceId: context.workspaceId,
          day: context.resolved.day,
          documentIds: context.resolved.documentIds,
          limit: context.resolved.limit,
        },
        async (agentStep) => {
          await appendStep(context.runId, agentStep);
        },
        context.runId,
      );

      state.counts.docsProcessed = distillResult.counts.docsProcessed;
      state.counts.conceptsProposed = distillResult.counts.conceptsProposed;
      state.counts.flashcardsProposed = distillResult.counts.flashcardsProposed;

      const splitArtifacts = await splitDistillerArtifactIds(context.workspaceId, distillResult.artifactIds);
      state.artifacts.conceptIds = splitArtifacts.conceptIds;
      state.artifacts.flashcardIds = splitArtifacts.flashcardIds;

      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_distill',
        status: 'ok',
        output: distillResult.counts,
      });
    } catch (error) {
      state.errors.push({
        stage: 'distill',
        message: error instanceof Error ? error.message : String(error),
      });
      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_distill',
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  } else {
    const reason =
      context.resolved.documentIds.length === 0
        ? 'No target documents resolved'
        : 'Mode does not include distillation';
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_distill',
      status: 'skipped',
      output: { reason },
    });
  }
}
