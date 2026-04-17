import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { getTodayView } from '@/server/services/today.service';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const scope = await requireSessionWorkspace();
    const todayView = await getTodayView(scope);
  
    return NextResponse.json(todayView, {
      status: 200,
      headers: {
        "Cache-Control": "no-store", // daily content + debugging simplicity
      },
    });
  } catch (error: unknown) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = publicErrorMessage(error, 'Failed to load today view');
    return NextResponse.json(
      { error: "TODAY_ROUTE_FAILED", message },
      { status: 500 }
    );
  }
}
