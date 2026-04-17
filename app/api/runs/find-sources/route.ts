import { NextResponse } from 'next/server';
import type { FindSourcesInput } from '@/server/services/findSources.service';
import { findSources } from '@/server/services/findSources.service';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { findSourcesRequestSchema } from '@/server/http/requestSchemas';
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
    const body = await parseJsonRequest(request, findSourcesRequestSchema, {
      route: '/api/runs/find-sources',
      allowEmptyObject: true,
    });

    const input: FindSourcesInput = {
      workspaceId: scope.workspaceId,
    };

    if (typeof body.day === 'string' && body.day.trim()) input.day = body.day.trim();
    if (typeof body.topicId === 'string' && body.topicId.trim()) input.topicId = body.topicId.trim();
    if (typeof body.goal === 'string' && body.goal.trim()) input.goal = body.goal.trim();
    if (body.scope === 'topic' || body.scope === 'all_topics') input.scope = body.scope;
    if (typeof body.maxTopics === 'number') input.maxTopics = body.maxTopics;
    if (typeof body.minQualityResults === 'number') input.minQualityResults = body.minQualityResults;
    if (typeof body.minRelevanceScore === 'number') input.minRelevanceScore = body.minRelevanceScore;
    if (typeof body.maxIterations === 'number') input.maxIterations = body.maxIterations;
    if (typeof body.maxQueries === 'number') input.maxQueries = body.maxQueries;

    const result = await findSources(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to find new sources') },
      { status: 500 },
    );
  }
}
