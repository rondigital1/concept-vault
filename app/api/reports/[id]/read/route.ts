import { NextResponse } from 'next/server';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { markReportRead } from '@/server/repos/report.repo';
import { publicErrorMessage } from '@/server/security/publicError';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const scope = await requireSessionWorkspace();
    const { id } = await params;
    const updated = await markReportRead(scope, id);

    if (!updated) {
      if ((await detectWorkspaceAccess({ table: 'artifacts', recordId: id, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'artifacts',
          action: 'mark_report_read',
          recordId: id,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return NextResponse.json(
        { error: 'Report not found or already read' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error marking report read:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to mark report read') },
      { status: 500 },
    );
  }
}
