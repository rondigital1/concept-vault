import { webScoutFlow } from '@/server/flows/webScout.flow';
import { WebScoutInput } from '@/server/agents/webScout.graph';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate and construct input
    const input: WebScoutInput = {
      mode: body.mode ?? 'explicit-query',
      query: body.query,
      deriveLimit: body.deriveLimit,
      focusTags: body.focusTags,
      maxResults: body.maxResults,
      minRelevanceScore: body.minRelevanceScore,
      day: body.day ?? new Date().toISOString().split('T')[0],
    };

    // Validate required fields based on mode
    if (input.mode === 'explicit-query' && !input.query) {
      return NextResponse.json(
        { error: 'Query is required for explicit-query mode' },
        { status: 400 }
      );
    }

    const result = await webScoutFlow(input);

    return NextResponse.json({
      runId: result.runId,
      proposals: result.output.proposals,
      counts: result.output.counts,
      queriesUsed: result.output.queriesUsed,
    });
  } catch (error) {
    console.error('Error in web-scout API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute web scout' },
      { status: 500 }
    );
  }
}
