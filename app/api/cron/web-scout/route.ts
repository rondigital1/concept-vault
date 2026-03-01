import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { webScoutFlow } from '@/server/flows/webScout.flow';
import { listSourceWatch } from '@/server/services/sourceWatch.service';
import { isCronRequestAuthorized } from '@/server/security/cronAuth';

export const runtime = 'nodejs';

type DailyWebScoutRequestBody = {
  goal?: string;
  day?: string;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
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

async function runDailyWebScout(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request, ['WEB_SCOUT_CRON_SECRET', 'CRON_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema(client);

  const watchlist = await listSourceWatch();
  const activeSourceCount = watchlist.filter((source) => source.isActive).length;
  if (activeSourceCount === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'No active source_watchlist entries configured',
    });
  }

  let body: DailyWebScoutRequestBody = {};
  if (request.method === 'POST') {
    try {
      body = (await request.json()) as DailyWebScoutRequestBody;
    } catch {
      body = {};
    }
  }

  const goal =
    (typeof body.goal === 'string' && body.goal.trim()) ||
    process.env.WEB_SCOUT_DAILY_GOAL ||
    'Find interesting high-quality articles from trusted sources that complement my vault.';

  const result = await webScoutFlow({
    goal,
    mode: 'derive-from-vault',
    day: typeof body.day === 'string' ? body.day : todayISODate(),
    minQualityResults: parseOptionalNumber(body.minQualityResults),
    minRelevanceScore: parseOptionalNumber(body.minRelevanceScore),
    maxIterations: parseOptionalNumber(body.maxIterations),
    maxQueries: parseOptionalNumber(body.maxQueries),
    importToLibrary: true,
    restrictToWatchlistDomains: true,
  });

  return NextResponse.json({
    ok: true,
    runId: result.runId,
    counts: result.output.counts,
    terminationReason: result.output.terminationReason,
    proposals: result.output.proposals.length,
  });
}

export async function GET(request: Request) {
  try {
    return await runDailyWebScout(request);
  } catch (error) {
    console.error('Error running daily web scout cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run daily web scout' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    return await runDailyWebScout(request);
  } catch (error) {
    console.error('Error running daily web scout cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run daily web scout' },
      { status: 500 },
    );
  }
}
