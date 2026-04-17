import { NextResponse } from 'next/server';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getRunTrace } from '@/server/observability/runTrace.store';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const scope = await requireSessionWorkspace();
    const { runId } = await params;
    const trace = await getRunTrace(scope, runId);

    if (!trace) {
      if ((await detectWorkspaceAccess({ table: 'runs', recordId: runId, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'runs',
          action: 'read_trace',
          recordId: runId,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(trace);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching run trace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch run trace' },
      { status: 500 }
    );
  }
}
