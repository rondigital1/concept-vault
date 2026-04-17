import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { listReports } from '@/server/repos/report.repo';
import { publicErrorMessage } from '@/server/security/publicError';

export async function GET() {
  try {
    const scope = await requireSessionWorkspace();
    const reports = await listReports(scope);
    return NextResponse.json(reports);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to list reports') },
      { status: 500 },
    );
  }
}
