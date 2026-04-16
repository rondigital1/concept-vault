import { NextResponse } from 'next/server';
import { PipelineInput, PipelineRunMode, PipelineTrigger, pipelineFlow } from '@/server/flows/pipeline.flow';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

const RESEARCH_FALLBACK_PATH = '/today';

type PipelineRequestBody = {
  day?: string;
  topicId?: string;
  documentIds?: string[];
  limit?: number;
  goal?: string;
  enableCategorization?: boolean;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  runMode?: PipelineRunMode;
  trigger?: PipelineTrigger;
  idempotencyKey?: string;
  enableAutoDistill?: boolean;
  skipPublish?: boolean;
};

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

function isFormRequest(contentType: string): boolean {
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

function parseBooleanFlag(value: FormDataEntryValue | null): boolean | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  return undefined;
}

function parseNumberFromForm(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {

    const input: PipelineInput = {};

    if (expectsJson) {
      const body = (await request.json()) as PipelineRequestBody;

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
      const form = await request.formData();

      const day = form.get('day');
      const topicId = form.get('topicId');
      const goal = form.get('goal');
      const documentIds = form
        .getAll('documentIds')
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
        .slice(0, 100);

      if (typeof day === 'string' && day.trim()) input.day = day.trim();
      if (typeof topicId === 'string' && topicId.trim()) input.topicId = topicId.trim();
      if (typeof goal === 'string' && goal.trim()) input.goal = goal.trim();
      if (documentIds.length > 0) input.documentIds = documentIds;

      const limit = parseNumberFromForm(form.get('limit'));
      if (typeof limit === 'number') input.limit = limit;

      const minQualityResults = parseNumberFromForm(form.get('minQualityResults'));
      if (typeof minQualityResults === 'number') input.minQualityResults = minQualityResults;

      const minRelevanceScore = parseNumberFromForm(form.get('minRelevanceScore'));
      if (typeof minRelevanceScore === 'number') input.minRelevanceScore = minRelevanceScore;

      const maxIterations = parseNumberFromForm(form.get('maxIterations'));
      if (typeof maxIterations === 'number') input.maxIterations = maxIterations;

      const maxQueries = parseNumberFromForm(form.get('maxQueries'));
      if (typeof maxQueries === 'number') input.maxQueries = maxQueries;

      const enableCategorization = parseBooleanFlag(form.get('enableCategorization'));
      if (typeof enableCategorization === 'boolean') {
        input.enableCategorization = enableCategorization;
      }

      const runMode = form.get('runMode');
      if (typeof runMode === 'string' && runMode.trim()) {
        input.runMode = runMode.trim() as PipelineRunMode;
      }

      const trigger = form.get('trigger');
      if (typeof trigger === 'string' && trigger.trim()) {
        input.trigger = trigger.trim() as PipelineTrigger;
      }

      const idempotencyKey = form.get('idempotencyKey');
      if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
        input.idempotencyKey = idempotencyKey.trim();
      }

      const enableAutoDistill = parseBooleanFlag(form.get('enableAutoDistill'));
      if (typeof enableAutoDistill === 'boolean') {
        input.enableAutoDistill = enableAutoDistill;
      }

      const skipPublish = parseBooleanFlag(form.get('skipPublish'));
      if (typeof skipPublish === 'boolean') {
        input.skipPublish = skipPublish;
      }
    }

    const result = await pipelineFlow(input);

    if (!expectsJson) {
      return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running pipeline:', error);
    const message = publicErrorMessage(error, 'Failed to run pipeline');
    if (!expectsJson) {
      return NextResponse.redirect(
        new URL(`${RESEARCH_FALLBACK_PATH}?pipelineError=${encodeURIComponent(message)}`, request.url),
        { status: 303 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
