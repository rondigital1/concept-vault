import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { pipelineFlow, type PipelineInput } from '@/server/flows/pipeline.flow';
import { refreshTopicRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const scope = await requireSessionWorkspace();
    const body = await parseJsonRequest(request, refreshTopicRequestSchema, {
      route: '/api/runs/refresh-topic',
    });

    const input: PipelineInput = {
      workspaceId: scope.workspaceId,
      trigger: 'manual',
      runMode: body.mode ?? 'incremental_update',
      topicId: body.topicId.trim(),
      enableCategorization: true,
    };

    if (typeof body.day === 'string' && body.day.trim()) input.day = body.day.trim();

    const result = await pipelineFlow(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to refresh topic') },
      { status: 500 },
    );
  }
}
