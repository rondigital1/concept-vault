import { curatorGraph } from '@/server/agents/curator.graph';
import { appendStep } from '@/server/observability/runTrace.store';
import { linkDocumentToMatchingTopics } from '@/server/repos/savedTopics.repo';
import { shouldRunCurate } from '@/server/flows/pipeline.policy';
import { appendPipelineFlowStep } from '@/server/flows/pipeline.trace';
import type { PipelineStageContext, PipelineStageState } from '@/server/flows/pipeline.stageState';

export async function runPipelineCurateStage(
  context: PipelineStageContext,
  state: PipelineStageState,
  enableCategorization: boolean,
): Promise<string[]> {
  const curateTags: string[] = [...context.resolved.focusTags];

  if (shouldRunCurate(context.mode) && context.resolved.documentIds.length > 0) {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_curate',
      status: 'running',
      input: {
        documentIds: context.resolved.documentIds,
        enableCategorization,
      },
    });

    const topicLinkSet = new Set<string>();

    for (const documentId of context.resolved.documentIds) {
      try {
        const curateResult = await curatorGraph(
          {
            workspaceId: context.workspaceId,
            documentId,
            enableCategorization,
          },
          async (agentStep) => {
            await appendStep(context.runId, agentStep);
          },
        );

        state.counts.docsCurated += 1;
        curateTags.push(...curateResult.tags);

        const linkedTopics = await linkDocumentToMatchingTopics(
          { workspaceId: context.workspaceId },
          documentId,
          curateResult.tags,
        );

        for (const topicId of linkedTopics.topicIds) {
          topicLinkSet.add(topicId);
        }
      } catch (error) {
        state.counts.docsCurateFailed += 1;
        state.errors.push({
          stage: 'curate',
          documentId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    state.counts.topicLinksCreated += topicLinkSet.size;

    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_curate',
      status: state.counts.docsCurateFailed > 0 ? 'error' : 'ok',
      output: {
        docsCurated: state.counts.docsCurated,
        docsCurateFailed: state.counts.docsCurateFailed,
        topicLinksCreated: state.counts.topicLinksCreated,
      },
    });
  } else {
    await appendPipelineFlowStep(context.runId, {
      name: 'pipeline_curate',
      status: 'skipped',
      output: {
        reason: context.resolved.documentIds.length === 0
          ? 'No target documents resolved'
          : 'Mode does not include curate',
      },
    });
  }

  return curateTags;
}
