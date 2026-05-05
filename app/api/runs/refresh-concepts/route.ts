import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { pipelineFlow, type PipelineInput } from '@/server/flows/pipeline.flow';
import { refreshConceptsRequestSchema } from '@/server/http/requestSchemas';
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
    const body = await parseJsonRequest(request, refreshConceptsRequestSchema, {
      route: '/api/runs/refresh-concepts',
      allowEmptyObject: true,
    });

    const input: PipelineInput = {
      workspaceId: scope.workspaceId,
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
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to refresh concepts') },
      { status: 500 },
    );
  }
}
