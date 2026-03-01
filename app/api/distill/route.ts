import { NextResponse } from 'next/server';
import { distillFlow } from '@/server/flows/distill.flow';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampLimit(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value), 20));
}

// GET /api/runs/distill - List distill runs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day') || todayISODate();
    const rawLimit = searchParams.get('limit');
    const limit = rawLimit ? clampLimit(Number.parseInt(rawLimit, 10), 10) : 10;

    // TODO: Implement listing distill runs
    return NextResponse.json({
      runs: [],
      day,
      limit,
    });
  } catch (error) {
    console.error('Error listing distill runs:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to list runs') },
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
      if (Array.isArray(body.documentIds)) {
        documentIds = body.documentIds
          .filter((id: unknown): id is string => typeof id === 'string')
          .slice(0, 100);
      }
      limit = clampLimit(body.limit, 5);
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
      { error: publicErrorMessage(error, 'Failed to create run') },
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
      { error: publicErrorMessage(error, 'Failed to update run') },
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
      { error: publicErrorMessage(error, 'Failed to delete run') },
      { status: 500 }
    );
  }
}
