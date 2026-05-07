import { markTopicRunCompleted } from '@/server/repos/savedTopics.repo';
import { createRun } from '@/server/observability/runTrace.store';
import { runPipelineCurateStage } from '@/server/flows/pipeline.curate';
import { runPipelineDistillStage } from '@/server/flows/pipeline.distillStage';
import { resolvePipelineModeContext } from '@/server/flows/pipeline.mode';
import { finalizePipelineStatus } from '@/server/flows/pipeline.policy';
import { runPipelineReportStage } from '@/server/flows/pipeline.reportStage';
import {
  buildPipelineResult,
  createDefaultPipelineArtifacts,
  createDefaultPipelineCounts,
} from '@/server/flows/pipeline.result';
import {
  findExistingPipelineRunByIdempotencyKey,
  hydratePipelineResultFromRun,
} from '@/server/flows/pipeline.runLookup';
import type { PipelineStageContext, PipelineStageState } from '@/server/flows/pipeline.stageState';
import {
  resolvePipelineTargets,
  resolvePipelineWorkspaceId,
} from '@/server/flows/pipeline.targets';
import { runPipelineTopicSetupStage } from '@/server/flows/pipeline.topicSetup';
import {
  appendPipelineFlowStep,
  completePipelineRun,
  finishPipelineRunAsError,
} from '@/server/flows/pipeline.trace';
import type {
  PipelineExecutionOptions,
  PipelineInput,
  PipelineResult,
} from '@/server/flows/pipeline.types';
import { runPipelineWebResearchStage } from '@/server/flows/pipeline.webResearch';

export type {
  PipelineCounts,
  PipelineError,
  PipelineExecutionOptions,
  PipelineInput,
  PipelineResult,
  PipelineRunMode,
  PipelineStage,
  PipelineTrigger,
} from '@/server/flows/pipeline.types';

export async function pipelineFlow(
  input: PipelineInput = {},
  options: PipelineExecutionOptions = {},
): Promise<PipelineResult> {
  const workspaceId = await resolvePipelineWorkspaceId(input);
  const trigger = input.trigger ?? 'manual';
  const { profiles, preselectedTopic, mode, idempotencyKey } = await resolvePipelineModeContext(input, workspaceId);

  if (!options.skipIdempotencyLookup && idempotencyKey) {
    const existing = await findExistingPipelineRunByIdempotencyKey(workspaceId, idempotencyKey);

    if (existing && existing.status !== 'error') {
      const hydrated = await hydratePipelineResultFromRun(workspaceId, existing.id);

      if (hydrated) {
        return hydrated;
      }

      if (existing.status === 'running') {
        return {
          runId: existing.id,
          status: 'running',
          mode,
          trigger,
          counts: createDefaultPipelineCounts(),
          artifacts: createDefaultPipelineArtifacts(),
          reportId: null,
          notionPageId: null,
          errors: [],
        };
      }
    }
  }

  const runId =
    options.runId ??
    (await createRun({ workspaceId }, 'pipeline', {
      runMode: mode,
      trigger,
      workspaceId,
      topicId: input.topicId ?? null,
      idempotencyKey,
    }));
  const state: PipelineStageState = {
    counts: createDefaultPipelineCounts(),
    artifacts: createDefaultPipelineArtifacts(),
    errors: [],
  };

  try {
    await appendPipelineFlowStep(runId, {
      name: 'pipeline',
      status: 'running',
      input: {
        ...input,
        runMode: mode,
        trigger,
      },
    });

    await appendPipelineFlowStep(runId, {
      name: 'pipeline_resolve_targets',
      status: 'running',
      input: {
        day: input.day,
        topicId: input.topicId,
        documentIds: input.documentIds,
        goal: input.goal,
        runMode: mode,
      },
    });

    const resolved = await resolvePipelineTargets(input, workspaceId, profiles, preselectedTopic);
    state.counts.docsTargeted = resolved.documentIds.length;
    const enableCategorization =
      input.enableCategorization ?? resolved.workflowSettings.enableCategorizationByDefault;
    const skipPublish = input.skipPublish ?? resolved.workflowSettings.skipPublishByDefault;

    await appendPipelineFlowStep(runId, {
      name: 'pipeline_resolve_targets',
      status: 'ok',
      output: {
        day: resolved.day,
        topicId: resolved.topic?.id ?? null,
        goal: resolved.goal,
        goalSource: resolved.goalSource,
        focusTags: resolved.focusTags,
        documentIds: resolved.documentIds,
        limit: resolved.limit,
        workflowSettings: resolved.workflowSettings,
      },
    });

    if (mode === 'skip') {
      if (resolved.topic) {
        await markTopicRunCompleted({ workspaceId }, resolved.topic.id, mode);
      }

      return completePipelineRun(
        buildPipelineResult({
          runId,
          status: 'ok',
          mode,
          trigger,
          counts: state.counts,
          artifacts: state.artifacts,
          reportId: null,
          notionPageId: null,
          errors: state.errors,
        }),
      );
    }

    const context: PipelineStageContext = {
      workspaceId,
      runId,
      mode,
      input,
      resolved,
    };

    if (mode === 'topic_setup') {
      const status = await runPipelineTopicSetupStage(context, state);

      return completePipelineRun(
        buildPipelineResult({
          runId,
          status,
          mode,
          trigger,
          counts: state.counts,
          artifacts: state.artifacts,
          reportId: null,
          notionPageId: null,
          errors: state.errors,
        }),
      );
    }

    const curateTags = await runPipelineCurateStage(context, state, enableCategorization);
    const webResearch = await runPipelineWebResearchStage(context, state, curateTags);
    await runPipelineDistillStage(context, state);
    const persisted = await runPipelineReportStage(context, state, webResearch, skipPublish);

    if (resolved.topic) {
      await markTopicRunCompleted({ workspaceId }, resolved.topic.id, mode);
    }

    const status = finalizePipelineStatus(mode, state.errors, webResearch.analyzedFindings, persisted.reportId);

    return completePipelineRun(
      buildPipelineResult({
        runId,
        status,
        mode,
        trigger,
        counts: state.counts,
        artifacts: state.artifacts,
        reportId: persisted.reportId,
        notionPageId: persisted.notionPageId,
        errors: state.errors,
      }),
    );
  } catch (error) {
    await appendPipelineFlowStep(runId, {
      name: 'pipeline_error',
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    await finishPipelineRunAsError(runId);
    throw error;
  }
}
