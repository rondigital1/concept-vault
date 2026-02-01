import { NextResponse } from 'next/server';
import { distillFlow } from '@/server/flows/distill.flow';

export const runtime = 'nodejs';

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// GET /api/runs/distill - List distill runs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day') || todayISODate();
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    // TODO: Implement listing distill runs
    return NextResponse.json({
      runs: [],
      day,
      limit,
    });
  } catch (error) {
    console.error('Error listing distill runs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list runs' },
      { status: 500 }
    );
  }
}

// POST /api/runs/distill - Create a new distill run
export async function POST(request: Request) {
  try {
    // Parse optional body parameters
    let documentIds: string[] | undefined;
    let limit: number | undefined;
    let topicTag: string | undefined;

    try {
      const body = await request.json();
      documentIds = body.documentIds;
      limit = body.limit;
      topicTag = body.topicTag;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const result = await distillFlow({
      day: todayISODate(),
      documentIds,
      limit,
      topicTag,
    });

    return NextResponse.json({
      runId: result.runId,
      artifactIds: result.output.artifactIds,
      counts: result.output.counts,
    });
  } catch (error) {
    console.error('Error creating distill run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create run' },
      { status: 500 }
    );
  }
}

// PUT /api/runs/distill - Update a distill run
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { runId, status } = body;

    if (!runId) {
      return NextResponse.json(
        { error: 'runId is required' },
        { status: 400 }
      );
    }

    // TODO: Implement updating distill run
    return NextResponse.json({
      runId,
      status,
      updated: true,
    });
  } catch (error) {
    console.error('Error updating distill run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update run' },
      { status: 500 }
    );
  }
}

// DELETE /api/runs/distill - Delete a distill run
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json(
        { error: 'runId query parameter is required' },
        { status: 400 }
      );
    }

    // TODO: Implement deleting distill run
    return NextResponse.json({
      runId,
      deleted: true,
    });
  } catch (error) {
    console.error('Error deleting distill run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete run' },
      { status: 500 }
    );
  }
}
