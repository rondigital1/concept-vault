import { NextResponse } from 'next/server';
import { startResearchFlow } from '@/server/flows/research.flow';
import { client, ensureSchema } from '@/db';

export const runtime = 'nodejs';

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    await ensureSchema(client);
    const { runId } = await startResearchFlow();

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/today', request.url), { status: 303 });
    }

    return NextResponse.json({ runId });
  } catch (error) {
    console.error('Error starting research flow:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start research' },
      { status: 500 },
    );
  }
}
