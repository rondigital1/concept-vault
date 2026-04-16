import { NextResponse } from 'next/server';
import { pipelineFlow, PipelineInput, PipelineRunMode } from '@/server/flows/pipeline.flow';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

type Body = {
  day?: string;
  topicId?: string;
  mode?: Extract<PipelineRunMode, 'full_report' | 'incremental_update' | 'concept_only' | 'scout_only'>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;

    if (typeof body.topicId !== 'string' || !body.topicId.trim()) {
      return NextResponse.json({ error: 'topicId is required' }, { status: 400 });
    }

    const input: PipelineInput = {
      trigger: 'manual',
      runMode: body.mode ?? 'incremental_update',
      topicId: body.topicId.trim(),
      enableCategorization: true,
    };

    if (typeof body.day === 'string' && body.day.trim()) input.day = body.day.trim();

    const result = await pipelineFlow(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to refresh topic') },
      { status: 500 },
    );
  }
}
