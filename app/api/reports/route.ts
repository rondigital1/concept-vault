import { NextResponse } from 'next/server';
import { listReports } from '@/server/repos/report.repo';
import { client, ensureSchema } from '@/db';
import { publicErrorMessage } from '@/server/security/publicError';

export async function GET() {
  try {
    await ensureSchema(client);
    const reports = await listReports();
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to list reports') },
      { status: 500 },
    );
  }
}
