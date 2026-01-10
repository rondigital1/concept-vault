import { NextResponse } from 'next/server';
import { getRunTrace } from '@/server/observability/runTrace.store';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const trace = await getRunTrace(runId);

    if (!trace) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(trace);
  } catch (error) {
    console.error('Error fetching run trace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch run trace' },
      { status: 500 }
    );
  }
}
