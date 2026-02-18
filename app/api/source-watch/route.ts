import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { createSourceWatch, listSourceWatch } from '@/server/services/sourceWatch.service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ensureSchema(client);
    const items = await listSourceWatch();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error listing source watch items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load source watch items' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema(client);

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
    const message =
      error instanceof Error ? error.message : 'Failed to create source watch item';
    const isConflict = message.toLowerCase().includes('duplicate key');
    const status = isConflict ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
