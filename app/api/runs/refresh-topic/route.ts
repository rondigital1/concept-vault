import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { PipelineInput } from '@/server/flows/pipeline.flow';
import { refreshTopicRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import {
  enqueuePipelineJob,
  executePipelineInline,
  isPipelineInlineExecutionEnabled,
  schedulePipelineJobDrain,
} from '@/server/jobs/pipelineJobs';
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

    if (isPipelineInlineExecutionEnabled()) {
      const result = await executePipelineInline(input);
      return NextResponse.json(result);
    }

    const queued = await enqueuePipelineJob({
      scope,
      route: '/api/runs/refresh-topic',
      input,
    });

    schedulePipelineJobDrain();

    return NextResponse.json(queued, { status: queued.reused && queued.status === 'succeeded' ? 200 : 202 });
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
