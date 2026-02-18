import { NextResponse } from 'next/server';
import { markReportRead } from '@/server/repos/report.repo';
import { client, ensureSchema } from '@/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSchema(client);
    const { id } = await params;
    const updated = await markReportRead(id);

    if (!updated) {
      return NextResponse.json(
        { error: 'Report not found or already read' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marking report read:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark report read' },
      { status: 500 },
    );
  }
}
