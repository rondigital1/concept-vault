import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { WebScoutInput } from '@/server/agents/webScout.graph';
import { startWebScoutFlow } from '@/server/flows/webScout.flow';

export const runtime = 'nodejs';

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

    const goal = typeof body.goal === 'string' ? body.goal : undefined;

    if (!goal) {
      return NextResponse.json(
        { error: 'goal is required' },
        { status: 400 },
      );
    }

    const input: WebScoutInput = {
      goal,
      mode: (body.mode as WebScoutInput['mode']) ?? 'derive-from-vault',
      day: typeof body.day === 'string' ? body.day : todayISODate(),
      focusTags: Array.isArray(body.focusTags)
        ? body.focusTags.filter((tag): tag is string => typeof tag === 'string')
        : undefined,
      minQualityResults: typeof body.minQualityResults === 'number' ? body.minQualityResults : undefined,
      minRelevanceScore: typeof body.minRelevanceScore === 'number' ? body.minRelevanceScore : undefined,
      maxIterations: typeof body.maxIterations === 'number' ? body.maxIterations : undefined,
      maxQueries: typeof body.maxQueries === 'number' ? body.maxQueries : undefined,
    };

    const { runId } = await startWebScoutFlow(input);
    return NextResponse.json({ runId });
  } catch (error) {
    console.error('Error starting web scout run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start web scout run' },
      { status: 500 },
    );
  }
}
