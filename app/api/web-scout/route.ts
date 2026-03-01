import { webScoutFlow } from '@/server/flows/webScout.flow';
import { WebScoutInput } from '@/server/agents/webScout.graph';
import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { publicErrorMessage } from '@/server/security/publicError';

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

    const body = await request.json();

    const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, 500) : '';
    const mode: WebScoutInput['mode'] =
      body.mode === 'derive-from-vault' ? 'derive-from-vault' : 'explicit-query';

    const input: WebScoutInput = {
      goal,
      mode,
      day: body.day ?? new Date().toISOString().split('T')[0],
      focusTags: Array.isArray(body.focusTags)
        ? body.focusTags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 20)
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

    if (!input.goal) {
      return NextResponse.json(
        { error: 'goal is required' },
        { status: 400 },
      );
    }

    const result = await webScoutFlow(input);

    return NextResponse.json({
      runId: result.runId,
      proposals: result.output.proposals,
      reasoning: result.output.reasoning,
      terminationReason: result.output.terminationReason,
      counts: result.output.counts,
    });
  } catch (error) {
    console.error('Error in web-scout API:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to execute web scout') },
      { status: 500 },
    );
  }
}
