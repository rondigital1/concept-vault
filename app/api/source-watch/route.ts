import { NextResponse } from 'next/server';
import { createSourceWatch, listSourceWatch } from '@/server/services/sourceWatch.service';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const items = await listSourceWatch();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error listing source watch items:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to load source watch items') },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {

    const body = await request.json();
    if (!body || typeof body.url !== 'string' || !body.url.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const item = await createSourceWatch({
      url: body.url,
      label: typeof body.label === 'string' ? body.label : undefined,
      kind: typeof body.kind === 'string' ? body.kind : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      checkIntervalHours:
        typeof body.checkIntervalHours === 'number' ? body.checkIntervalHours : undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const internalMessage = error instanceof Error ? error.message : String(error);
    const isConflict = internalMessage.toLowerCase().includes('duplicate key');
    const status = isConflict ? 409 : 400;
    const errorMessage = isConflict
      ? 'Source watch item already exists'
      : publicErrorMessage(error, 'Failed to create source watch item');
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
