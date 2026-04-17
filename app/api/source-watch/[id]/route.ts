import { NextResponse } from 'next/server';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { sourceWatchUpdateRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { deleteSourceWatch, updateSourceWatch } from '@/server/services/sourceWatch.service';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const scope = await requireSessionWorkspace();
    const { id } = await params;
    const body = await parseJsonRequest(request, sourceWatchUpdateRequestSchema, {
      route: '/api/source-watch/[id]',
      allowEmptyObject: true,
    });

    const item = await updateSourceWatch(scope, id, {
      url: typeof body.url === 'string' ? body.url : undefined,
      label: typeof body.label === 'string' ? body.label : undefined,
      kind: typeof body.kind === 'string' ? body.kind : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      checkIntervalHours:
        typeof body.checkIntervalHours === 'number' ? body.checkIntervalHours : undefined,
    });

    if (!item) {
      if ((await detectWorkspaceAccess({ table: 'source_watchlist', recordId: id, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'source_watchlist',
          action: 'update',
          recordId: id,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return NextResponse.json({ error: 'Source watch item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const internalMessage = error instanceof Error ? error.message : String(error);
    const isConflict = internalMessage.toLowerCase().includes('duplicate key');
    const status = isConflict ? 409 : 400;
    const errorMessage = isConflict
      ? 'Source watch item already exists'
      : publicErrorMessage(error, 'Failed to update source watch item');
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const scope = await requireSessionWorkspace();
    const { id } = await params;
    const ok = await deleteSourceWatch(scope, id);

    if (!ok) {
      if ((await detectWorkspaceAccess({ table: 'source_watchlist', recordId: id, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'source_watchlist',
          action: 'delete',
          recordId: id,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return NextResponse.json({ error: 'Source watch item not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting source watch item:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to delete source watch item') },
      { status: 500 },
    );
  }
}
