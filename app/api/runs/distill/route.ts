import { NextResponse } from 'next/server';
import { createRun, appendStep, finishRun } from '@/server/observability/runTrace.store';
import { RunStep } from '@/server/observability/runTrace.types';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const runId = await createRun('distill');

    // Add mock steps
    const mockSteps: RunStep[] = [
      {
        timestamp: new Date().toISOString(),
        type: 'flow',
        name: 'distill_flow',
        status: 'started',
      },
      {
        timestamp: new Date(Date.now() + 1000).toISOString(),
        type: 'agent',
        name: 'distiller_agent',
        status: 'started',
      },
      {
        timestamp: new Date(Date.now() + 2000).toISOString(),
        type: 'tool',
        name: 'web_search',
        status: 'completed',
        duration: 500,
      },
      {
        timestamp: new Date(Date.now() + 3000).toISOString(),
        type: 'llm',
        name: 'gpt-4',
        status: 'completed',
        duration: 1200,
      },
      {
        timestamp: new Date(Date.now() + 4000).toISOString(),
        type: 'agent',
        name: 'distiller_agent',
        status: 'completed',
      },
      {
        timestamp: new Date(Date.now() + 5000).toISOString(),
        type: 'flow',
        name: 'distill_flow',
        status: 'completed',
      },
    ];

    for (const step of mockSteps) {
      await appendStep(runId, step);
    }

    await finishRun(runId, 'completed');

    return NextResponse.json({ runId });
  } catch (error) {
    console.error('Error creating distill run:', error);
    return NextResponse.json(
      { error: 'Failed to create run' },
      { status: 500 }
    );
  }
}
