import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { pipelineFlow, PipelineInput } from '@/server/flows/pipeline.flow';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

type Body = {
  day?: string;
  topicId?: string;
  documentIds?: string[];
  limit?: number;
};

export async function POST(request: Request) {
  try {
    await ensureSchema(client);
    const body = (await request.json().catch(() => ({}))) as Body;

    const input: PipelineInput = {
      trigger: 'manual',
      runMode: 'concept_only',
      enableCategorization: true,
    };

    if (typeof body.day === 'string' && body.day.trim()) input.day = body.day.trim();
    if (typeof body.topicId === 'string' && body.topicId.trim()) input.topicId = body.topicId.trim();
    if (Array.isArray(body.documentIds)) input.documentIds = body.documentIds.filter((id): id is string => typeof id === 'string');
    if (typeof body.limit === 'number' && Number.isFinite(body.limit)) input.limit = body.limit;

    const result = await pipelineFlow(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to refresh concepts') },
      { status: 500 },
    );
  }
}
