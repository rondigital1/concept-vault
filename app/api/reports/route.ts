import { NextResponse } from 'next/server';
import { listReports } from '@/server/repos/report.repo';
import { client, ensureSchema } from '@/db';

export async function GET() {
  try {
    await ensureSchema(client);
    const reports = await listReports();
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list reports' },
      { status: 500 },
    );
  }
}
