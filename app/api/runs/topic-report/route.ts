import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { topicReportFlow, TopicReportFlowInput } from '@/server/flows/topicReport.flow';

export const runtime = 'nodejs';

type TopicReportRequestBody = {
  day?: string;
  topicIds?: string[];
  includeInactive?: boolean;
  maxDocsPerTopic?: number;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  enableCategorization?: boolean;
  saveReport?: boolean;
};

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

function parseBooleanFlag(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on';
}

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTopicIdsFromForm(form: FormData): string[] {
  const values = form.getAll('topicIds');
  if (values.length === 0) {
    return [];
  }

  const ids = values
    .flatMap((value) => (typeof value === 'string' ? value.split(',') : []))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(ids)];
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    await ensureSchema(client);
    const input: TopicReportFlowInput = {};

    if (expectsJson) {
      const body = (await request.json()) as TopicReportRequestBody;
      if (typeof body.day === 'string' && body.day.trim()) {
        input.day = body.day.trim();
      }
      if (Array.isArray(body.topicIds)) {
        input.topicIds = body.topicIds.filter((id): id is string => typeof id === 'string');
      }
      if (typeof body.includeInactive === 'boolean') {
        input.includeInactive = body.includeInactive;
      }
      if (typeof body.maxDocsPerTopic === 'number') {
        input.maxDocsPerTopic = body.maxDocsPerTopic;
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
      if (typeof body.enableCategorization === 'boolean') {
        input.enableCategorization = body.enableCategorization;
      }
      if (typeof body.saveReport === 'boolean') {
        input.saveReport = body.saveReport;
      }
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData();
      const rawDay = form.get('day');
      if (typeof rawDay === 'string' && rawDay.trim()) {
        input.day = rawDay.trim();
      }

      const topicIds = parseTopicIdsFromForm(form);
      if (topicIds.length > 0) {
        input.topicIds = topicIds;
      }

      input.includeInactive = parseBooleanFlag(form.get('includeInactive'));
      input.enableCategorization = parseBooleanFlag(form.get('enableCategorization'));

      const maxDocsPerTopic = parseNumber(form.get('maxDocsPerTopic'));
      if (typeof maxDocsPerTopic === 'number') {
        input.maxDocsPerTopic = maxDocsPerTopic;
      }

      const minQualityResults = parseNumber(form.get('minQualityResults'));
      if (typeof minQualityResults === 'number') {
        input.minQualityResults = minQualityResults;
      }

      const minRelevanceScore = parseNumber(form.get('minRelevanceScore'));
      if (typeof minRelevanceScore === 'number') {
        input.minRelevanceScore = minRelevanceScore;
      }

      const maxIterations = parseNumber(form.get('maxIterations'));
      if (typeof maxIterations === 'number') {
        input.maxIterations = maxIterations;
      }

      const maxQueries = parseNumber(form.get('maxQueries'));
      if (typeof maxQueries === 'number') {
        input.maxQueries = maxQueries;
      }

      // Default true when used as form button.
      input.saveReport = !parseBooleanFlag(form.get('saveReportFalse'));
    }

    const result = await topicReportFlow(input);

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running topic report workflow:', error);
    if (!expectsJson) {
      return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run topic report workflow' },
      { status: 500 },
    );
  }
}
