import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { sourceWatchCreateRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { createSourceWatch, listSourceWatch } from '@/server/services/sourceWatch.service';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const scope = await requireSessionWorkspace();
    const items = await listSourceWatch(scope);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listing source watch items:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to load source watch items') },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const scope = await requireSessionWorkspace();
    const body = await parseJsonRequest(request, sourceWatchCreateRequestSchema, {
      route: '/api/source-watch',
    });

    const item = await createSourceWatch(scope, {
      url: body.url,
      label: typeof body.label === 'string' ? body.label : undefined,
      kind: typeof body.kind === 'string' ? body.kind : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      checkIntervalHours:
        typeof body.checkIntervalHours === 'number' ? body.checkIntervalHours : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
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
      : publicErrorMessage(error, 'Failed to create source watch item');
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
