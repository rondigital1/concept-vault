import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { topicReportFlow, TopicReportFlowInput } from '@/server/flows/topicReport.flow';
import { isCronRequestAuthorized } from '@/server/security/cronAuth';

export const runtime = 'nodejs';

type DailyTopicReportRequestBody = {
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

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function parseTopicIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const topicIds = value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return topicIds.length > 0 ? topicIds : undefined;
}

async function runDailyTopicReport(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request, ['TOPIC_REPORT_CRON_SECRET', 'CRON_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema(client);

  let body: DailyTopicReportRequestBody = {};
  if (request.method === 'POST') {
    try {
      body = (await request.json()) as DailyTopicReportRequestBody;
    } catch {
      body = {};
    }
  }

  const input: TopicReportFlowInput = {
    day: typeof body.day === 'string' && body.day.trim() ? body.day.trim() : todayISODate(),
    saveReport: body.saveReport ?? true,
  };

  const topicIds = parseTopicIds(body.topicIds);
  if (topicIds) {
    input.topicIds = topicIds;
  }

  const includeInactive = parseOptionalBoolean(body.includeInactive);
  if (includeInactive !== undefined) {
    input.includeInactive = includeInactive;
  }

  const maxDocsPerTopic = parseOptionalNumber(body.maxDocsPerTopic);
  if (maxDocsPerTopic !== undefined) {
    input.maxDocsPerTopic = maxDocsPerTopic;
  }

  const minQualityResults = parseOptionalNumber(body.minQualityResults);
  if (minQualityResults !== undefined) {
    input.minQualityResults = minQualityResults;
  }

  const minRelevanceScore = parseOptionalNumber(body.minRelevanceScore);
  if (minRelevanceScore !== undefined) {
    input.minRelevanceScore = minRelevanceScore;
  }

  const maxIterations = parseOptionalNumber(body.maxIterations);
  if (maxIterations !== undefined) {
    input.maxIterations = maxIterations;
  }

  const maxQueries = parseOptionalNumber(body.maxQueries);
  if (maxQueries !== undefined) {
    input.maxQueries = maxQueries;
  }

  const enableCategorization = parseOptionalBoolean(body.enableCategorization);
  if (enableCategorization !== undefined) {
    input.enableCategorization = enableCategorization;
  }

  const result = await topicReportFlow(input);

  return NextResponse.json({
    ok: true,
    runId: result.runId,
    reportId: result.reportId,
    day: result.day,
    topicsProcessed: result.topicsProcessed,
    counts: result.counts,
  });
}

export async function GET(request: Request) {
  try {
    return await runDailyTopicReport(request);
  } catch (error) {
    console.error('Error running daily topic-report cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run topic report cron' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    return await runDailyTopicReport(request);
  } catch (error) {
    console.error('Error running daily topic-report cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run topic report cron' },
      { status: 500 },
    );
  }
}
