import { NextResponse } from 'next/server';
import { distillFlow } from '@/server/flows/distill.flow';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type DistillRequestBody = {
  documentIds?: string[];
  limit?: number;
  topicTag?: string;
};

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

function clampLimit(value: number): number {
  return Math.max(1, Math.min(Math.floor(value), 20));
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    let documentIds: string[] | undefined;
    let limit: number | undefined;
    let topicTag: string | undefined;

    if (expectsJson) {
      const body = (await request.json()) as DistillRequestBody;

      if (Array.isArray(body.documentIds)) {
        documentIds = body.documentIds
          .filter((id): id is string => typeof id === 'string')
          .slice(0, 100);
      }
      if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
        limit = clampLimit(body.limit);
      }
      if (typeof body.topicTag === 'string') {
        topicTag = body.topicTag;
      }
    }

    const result = await distillFlow({
      day: todayISODate(),
      documentIds,
      limit,
      topicTag,
    });

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
    }

    return NextResponse.json({
      runId: result.runId,
      artifactIds: result.output.artifactIds,
      counts: result.output.counts,
    });
  } catch (error) {
    console.error('Error creating distill run:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to create run') },
      { status: 500 }
    );
  }
}
