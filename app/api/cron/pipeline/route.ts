import { NextResponse } from 'next/server';
import { resolveDefaultWorkspaceScope } from '@/server/auth/workspaceContext';
import {
  pipelineFlow,
  type PipelineInput,
  type PipelineRunMode,
} from '@/server/flows/pipeline.flow';
import { cronPipelineRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { getOrCreateRequestId, setResponseRequestId } from '@/server/observability/context';
import { logger } from '@/server/observability/logger';
import { listDueTrackedTopics, getSavedTopicsByIds } from '@/server/repos/savedTopics.repo';
import { decideScheduledRunMode, setupTopicContext } from '@/server/services/topicWorkflow.service';
import { isCronRequestAuthorized } from '@/server/security/cronAuth';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

type CronPipelineBody = {
  day?: string;
  topicId?: string;
  limit?: number;
  goal?: string;
  enableCategorization?: boolean;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  runMode?: PipelineRunMode;
  maxTopics?: number;
};

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

async function runSinglePipeline(input: PipelineInput): Promise<Response> {
  const result = await pipelineFlow(input);
  return NextResponse.json({
    ok: true,
    runId: result.runId,
    status: result.status,
    mode: result.mode,
    counts: result.counts,
    reportId: result.reportId,
    errors: result.errors,
  });
}

async function runTrackedTopicsScheduler(day: string, maxTopics: number): Promise<Response> {
  const scope = await resolveDefaultWorkspaceScope();
  const dueTopics = await listDueTrackedTopics(scope, new Date());
  const selectedTopics = dueTopics.slice(0, maxTopics);

  const runs: Array<{
    topicId: string;
    topicName: string;
    chosenMode: PipelineRunMode;
    decisionReason: string;
    runId: string;
    jobId: string | null;
    status: string;
  }> = [];

  for (const topic of selectedTopics) {
    await setupTopicContext(scope, topic.id);
    const refreshed = await getSavedTopicsByIds(scope, [topic.id]);
    const activeTopic = refreshed[0] ?? topic;

    const decision = await decideScheduledRunMode(scope, activeTopic);

    const input: PipelineInput = {
      workspaceId: scope.workspaceId,
      day,
      topicId: topic.id,
      runMode: decision.mode,
      trigger: 'scheduler',
      idempotencyKey: `scheduler:${day}:${topic.id}:${decision.mode}`,
      enableCategorization: true,
    };

    const result = await pipelineFlow(input);

    runs.push({
      topicId: topic.id,
      topicName: topic.name,
      chosenMode: decision.mode,
      decisionReason: decision.reason,
      runId: result.runId,
      jobId: null,
      status: result.status,
    });
  }

  return NextResponse.json({
    ok: true,
    day,
    dueTopics: dueTopics.length,
    processedTopics: selectedTopics.length,
    runs,
  });
}

async function runCronPipeline(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request, ['PIPELINE_CRON_SECRET', 'CRON_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CronPipelineBody = {};
  if (request.method === 'POST') {
    body = await parseJsonRequest(request, cronPipelineRequestSchema, {
      route: '/api/cron/pipeline',
      allowEmptyObject: true,
    });
  }

  const day = typeof body.day === 'string' && body.day.trim() ? body.day.trim() : undefined;

  // If a specific topic or explicit run mode is supplied, run the requested single pipeline.
  if ((typeof body.topicId === 'string' && body.topicId.trim()) || body.runMode || body.goal) {
    const scope = await resolveDefaultWorkspaceScope();
    const input: PipelineInput = {
      workspaceId: scope.workspaceId,
      trigger: 'cron',
    };

    if (day) input.day = day;
    if (typeof body.topicId === 'string' && body.topicId.trim()) input.topicId = body.topicId.trim();
    if (typeof body.goal === 'string' && body.goal.trim()) input.goal = body.goal.trim();
    if (typeof body.runMode === 'string') input.runMode = body.runMode;

    const limit = parseOptionalNumber(body.limit);
    if (typeof limit === 'number') input.limit = limit;

    const minQualityResults = parseOptionalNumber(body.minQualityResults);
    if (typeof minQualityResults === 'number') input.minQualityResults = minQualityResults;

    const minRelevanceScore = parseOptionalNumber(body.minRelevanceScore);
    if (typeof minRelevanceScore === 'number') input.minRelevanceScore = minRelevanceScore;

    const maxIterations = parseOptionalNumber(body.maxIterations);
    if (typeof maxIterations === 'number') input.maxIterations = maxIterations;

    const maxQueries = parseOptionalNumber(body.maxQueries);
    if (typeof maxQueries === 'number') input.maxQueries = maxQueries;

    const enableCategorization = parseOptionalBoolean(body.enableCategorization);
    if (typeof enableCategorization === 'boolean') input.enableCategorization = enableCategorization;

    return runSinglePipeline(input);
  }

  const schedulerDay = day ?? new Date().toISOString().slice(0, 10);
  const maxTopics = Math.max(1, Math.min(20, parseOptionalNumber(body.maxTopics) ?? 10));
  return runTrackedTopicsScheduler(schedulerDay, maxTopics);
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  return logger.withContext({ requestId, route: '/api/cron/pipeline' }, async () => {
    try {
      return setResponseRequestId(await runCronPipeline(request), requestId);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return setResponseRequestId(validationErrorResponse(error), requestId);
      }
      logger.error('pipeline.cron.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return setResponseRequestId(
        NextResponse.json(
          { error: publicErrorMessage(error, 'Failed to run pipeline cron') },
          { status: 500 },
        ),
        requestId,
      );
    }
  });
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  return logger.withContext({ requestId, route: '/api/cron/pipeline' }, async () => {
    try {
      return setResponseRequestId(await runCronPipeline(request), requestId);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return setResponseRequestId(validationErrorResponse(error), requestId);
      }
      logger.error('pipeline.cron.failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return setResponseRequestId(
        NextResponse.json(
          { error: publicErrorMessage(error, 'Failed to run pipeline cron') },
          { status: 500 },
        ),
        requestId,
      );
    }
  });
}
