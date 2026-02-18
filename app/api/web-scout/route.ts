import { webScoutFlow } from '@/server/flows/webScout.flow';
import { WebScoutInput } from '@/server/agents/webScout.graph';
import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';

export async function POST(request: Request) {
  try {
    await ensureSchema(client);

    const body = await request.json();

    const input: WebScoutInput = {
      goal: body.goal,
      mode: body.mode ?? 'explicit-query',
      day: body.day ?? new Date().toISOString().split('T')[0],
      focusTags: body.focusTags,
      minQualityResults: body.minQualityResults,
      minRelevanceScore: body.minRelevanceScore,
      maxIterations: body.maxIterations,
      maxQueries: body.maxQueries,
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
      { error: error instanceof Error ? error.message : 'Failed to execute web scout' },
      { status: 500 },
    );
  }
}
