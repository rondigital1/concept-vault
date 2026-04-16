import { NextResponse } from 'next/server';
import { deleteSourceWatch, updateSourceWatch } from '@/server/services/sourceWatch.service';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await updateSourceWatch(id, {
      url: typeof body.url === 'string' ? body.url : undefined,
      label: typeof body.label === 'string' ? body.label : undefined,
      kind: typeof body.kind === 'string' ? body.kind : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      checkIntervalHours:
        typeof body.checkIntervalHours === 'number' ? body.checkIntervalHours : undefined,
    });

    if (!item) {
      return NextResponse.json({ error: 'Source watch item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
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
    const { id } = await params;
    const ok = await deleteSourceWatch(id);

    if (!ok) {
      return NextResponse.json({ error: 'Source watch item not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting source watch item:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to delete source watch item') },
      { status: 500 },
    );
  }
}
