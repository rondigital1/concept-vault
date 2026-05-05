import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import {
  pipelineFlow,
  type PipelineInput,
  type PipelineRunMode,
  type PipelineTrigger,
} from '@/server/flows/pipeline.flow';
import { pipelineRequestSchema } from '@/server/http/requestSchemas';
import {
  formString,
  isFormRequest,
  isJsonRequest,
  parseBooleanFlag,
  parseFormRequest,
  parseJsonRequest,
  parseNumberFromForm,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { getOrCreateRequestId, setResponseRequestId } from '@/server/observability/context';
import { logger } from '@/server/observability/logger';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

const RESEARCH_FALLBACK_PATH = '/today';

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);
  const requestId = getOrCreateRequestId(request);

  return logger.withContext(
    {
      requestId,
      route: '/api/runs/pipeline',
    },
    async () => {
      try {
        const scope = await requireSessionWorkspace();

        const input: PipelineInput = {
          workspaceId: scope.workspaceId,
        };

    if (expectsJson) {
      const body = await parseJsonRequest(request, pipelineRequestSchema, {
        route: '/api/runs/pipeline',
        allowEmptyObject: true,
      });

      if (typeof body.day === 'string' && body.day.trim()) {
        input.day = body.day.trim();
      }
      if (typeof body.topicId === 'string' && body.topicId.trim()) {
        input.topicId = body.topicId.trim();
      }
      if (Array.isArray(body.documentIds)) {
        input.documentIds = body.documentIds
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 100);
      }
      if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
        input.limit = body.limit;
      }
      if (typeof body.goal === 'string' && body.goal.trim()) {
        input.goal = body.goal.trim();
      }
      if (typeof body.enableCategorization === 'boolean') {
        input.enableCategorization = body.enableCategorization;
      }
      if (typeof body.minQualityResults === 'number') {
        input.minQualityResults = body.minQualityResults;
      }
      if (typeof body.minRelevanceScore === 'number') {
        input.minRelevanceScore = body.minRelevanceScore;
      }
      if (typeof body.maxIterations === 'number') {
        input.maxIterations = body.maxIterations;
      }
      if (typeof body.maxQueries === 'number') {
        input.maxQueries = body.maxQueries;
      }
      if (typeof body.runMode === 'string') {
        input.runMode = body.runMode;
      }
      if (typeof body.trigger === 'string') {
        input.trigger = body.trigger;
      }
      if (typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()) {
        input.idempotencyKey = body.idempotencyKey.trim();
      }
      if (typeof body.enableAutoDistill === 'boolean') {
        input.enableAutoDistill = body.enableAutoDistill;
      }
      if (typeof body.skipPublish === 'boolean') {
        input.skipPublish = body.skipPublish;
      }
    } else if (isFormRequest(contentType)) {
      const body = await parseFormRequest(request, pipelineRequestSchema, {
        route: '/api/runs/pipeline',
        mapFormData: (form) => ({
          day: formString(form, 'day'),
          topicId: formString(form, 'topicId'),
          goal: formString(form, 'goal'),
          documentIds: form
            .getAll('documentIds')
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map((value) => value.trim())
            .slice(0, 100),
          limit: parseNumberFromForm(form.get('limit')),
          minQualityResults: parseNumberFromForm(form.get('minQualityResults')),
          minRelevanceScore: parseNumberFromForm(form.get('minRelevanceScore')),
          maxIterations: parseNumberFromForm(form.get('maxIterations')),
          maxQueries: parseNumberFromForm(form.get('maxQueries')),
          enableCategorization: parseBooleanFlag(form.get('enableCategorization')),
          runMode: formString(form, 'runMode'),
          trigger: formString(form, 'trigger'),
          idempotencyKey: formString(form, 'idempotencyKey'),
          enableAutoDistill: parseBooleanFlag(form.get('enableAutoDistill')),
          skipPublish: parseBooleanFlag(form.get('skipPublish')),
        }),
      });

      if (typeof body.day === 'string' && body.day.trim()) input.day = body.day.trim();
      if (typeof body.topicId === 'string' && body.topicId.trim()) input.topicId = body.topicId.trim();
      if (typeof body.goal === 'string' && body.goal.trim()) input.goal = body.goal.trim();
      if (Array.isArray(body.documentIds) && body.documentIds.length > 0) {
        input.documentIds = body.documentIds;
      }

      const limit = body.limit;
      if (typeof limit === 'number') input.limit = limit;

      const minQualityResults = body.minQualityResults;
      if (typeof minQualityResults === 'number') input.minQualityResults = minQualityResults;

      const minRelevanceScore = body.minRelevanceScore;
      if (typeof minRelevanceScore === 'number') input.minRelevanceScore = minRelevanceScore;

      const maxIterations = body.maxIterations;
      if (typeof maxIterations === 'number') input.maxIterations = maxIterations;

      const maxQueries = body.maxQueries;
      if (typeof maxQueries === 'number') input.maxQueries = maxQueries;

      const enableCategorization = body.enableCategorization;
      if (typeof enableCategorization === 'boolean') {
        input.enableCategorization = enableCategorization;
      }

      const runMode = body.runMode;
      if (typeof runMode === 'string' && runMode.trim()) {
        input.runMode = runMode.trim() as PipelineRunMode;
      }

      const trigger = body.trigger;
      if (typeof trigger === 'string' && trigger.trim()) {
        input.trigger = trigger.trim() as PipelineTrigger;
      }

      const idempotencyKey = body.idempotencyKey;
      if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
        input.idempotencyKey = idempotencyKey.trim();
      }

      const enableAutoDistill = body.enableAutoDistill;
      if (typeof enableAutoDistill === 'boolean') {
        input.enableAutoDistill = enableAutoDistill;
      }

      const skipPublish = body.skipPublish;
      if (typeof skipPublish === 'boolean') {
        input.skipPublish = skipPublish;
      }
    }

        const result = await pipelineFlow(input);

        if (!expectsJson) {
          return setResponseRequestId(
            NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 }),
            requestId,
          );
        }

        return setResponseRequestId(NextResponse.json(result), requestId);
      } catch (error) {
        if (error instanceof RequestValidationError) {
          if (!expectsJson) {
            return setResponseRequestId(
              NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 }),
              requestId,
            );
          }
          return setResponseRequestId(validationErrorResponse(error), requestId);
        }
        if (error instanceof WorkspaceAccessError) {
          const message = error.message;
          if (!expectsJson) {
            return setResponseRequestId(
              NextResponse.redirect(
                new URL(`${RESEARCH_FALLBACK_PATH}?pipelineError=${encodeURIComponent(message)}`, request.url),
                { status: 303 },
              ),
              requestId,
            );
          }
          return setResponseRequestId(
            NextResponse.json({ error: message }, { status: error.status }),
            requestId,
          );
        }

        logger.error('pipeline.route.failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        const message = publicErrorMessage(error, 'Failed to run pipeline');
        if (!expectsJson) {
          return setResponseRequestId(
            NextResponse.redirect(
              new URL(`${RESEARCH_FALLBACK_PATH}?pipelineError=${encodeURIComponent(message)}`, request.url),
              { status: 303 },
            ),
            requestId,
          );
        }
        return setResponseRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
      }
    },
  );
}
