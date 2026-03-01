import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { WebScoutInput } from '@/server/agents/webScout.graph';
import { startWebScoutFlow } from '@/server/flows/webScout.flow';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(min, Math.min(Math.floor(value), max));
}

function clampScore(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(value, 1));
}

export async function POST(request: Request) {
  try {
    await ensureSchema(client);

    let body: Record<string, unknown> = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is fine, defaults apply.
    }

    const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, 500) : undefined;

    if (!goal) {
      return NextResponse.json(
        { error: 'goal is required' },
        { status: 400 },
      );
    }

    const mode: WebScoutInput['mode'] =
      body.mode === 'explicit-query' ? 'explicit-query' : 'derive-from-vault';

    const input: WebScoutInput = {
      goal,
      mode,
      day: typeof body.day === 'string' ? body.day : todayISODate(),
      focusTags: Array.isArray(body.focusTags)
        ? body.focusTags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20)
        : undefined,
      minQualityResults: clampInt(body.minQualityResults, 1, 10),
      minRelevanceScore: clampScore(body.minRelevanceScore),
      maxIterations: clampInt(body.maxIterations, 1, 10),
      maxQueries: clampInt(body.maxQueries, 1, 25),
      importToLibrary: typeof body.importToLibrary === 'boolean' ? body.importToLibrary : undefined,
      restrictToWatchlistDomains:
        typeof body.restrictToWatchlistDomains === 'boolean'
          ? body.restrictToWatchlistDomains
          : undefined,
    };

    const { runId } = await startWebScoutFlow(input);
    return NextResponse.json({ runId });
  } catch (error) {
    console.error('Error starting web scout run:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to start web scout run') },
      { status: 500 },
    );
  }
}
