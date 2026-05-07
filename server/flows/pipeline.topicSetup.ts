import type { RunStatus } from '@/server/observability/runTrace.types';
import { setupTopicContext } from '@/server/services/topicWorkflow.service';
import { appendPipelineFlowStep } from '@/server/flows/pipeline.trace';
import type { PipelineStageContext, PipelineStageState } from '@/server/flows/pipeline.stageState';

export async function runPipelineTopicSetupStage(
  context: PipelineStageContext,
  state: PipelineStageState,
): Promise<RunStatus> {
  await appendPipelineFlowStep(context.runId, {
    name: 'pipeline_topic_setup',
    status: 'running',
    input: { topicId: context.resolved.topic?.id ?? null },
  });

  if (!context.resolved.topic) {
    state.errors.push({
      stage: 'topic_setup',
      message: 'topicId is required for topic_setup mode',
    });
  } else {
    try {
      const setupResult = await setupTopicContext({ workspaceId: context.workspaceId }, context.resolved.topic.id);
      state.counts.topicLinksCreated = setupResult.linkedCount;
      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_topic_setup',
        status: 'ok',
        output: setupResult,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.errors.push({
        stage: 'topic_setup',
        message,
      });
      await appendPipelineFlowStep(context.runId, {
        name: 'pipeline_topic_setup',
        status: 'error',
        error: { message },
      });
    }
  }

  return state.errors.length > 0 ? 'partial' : 'ok';
}
