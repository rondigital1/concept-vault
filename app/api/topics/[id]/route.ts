import { NextResponse } from 'next/server';
import { detectWorkspaceAccess, recordAuthorizationDenied } from '@/server/auth/authzAudit';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { updateTopicRequestSchema } from '@/server/http/requestSchemas';
import {
  parseJsonRequest,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import {
  countTopicLinkedDocuments,
  getSavedTopicsByIds,
  updateSavedTopic,
  type TopicCadence,
} from '@/server/repos/savedTopics.repo';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import {
  isAgentDefaultRunMode,
  mergeTopicWorkflowMetadata,
  resolveTopicWorkflowSettings,
} from '@/server/agents/configuration';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

function normalizeFocusTags(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const cleaned = rawTags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.toLowerCase().trim().replace(/\s+/g, ' '))
    .filter((tag) => tag.length >= 2 && tag.length <= 40);

  return [...new Set(cleaned)].slice(0, 20);
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.floor(value), max));
}

function clampScore(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(value, 1));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const scope = await requireSessionWorkspace();
    const { id } = await params;
    const body = await parseJsonRequest(request, updateTopicRequestSchema, {
      route: '/api/topics/[id]',
      allowEmptyObject: true,
    });

    const existingTopic = (await getSavedTopicsByIds(scope, [id]))[0] ?? null;
    if (!existingTopic) {
      if ((await detectWorkspaceAccess({ table: 'saved_topics', recordId: id, workspaceId: scope.workspaceId })) === 'forbidden') {
        recordAuthorizationDenied({
          table: 'saved_topics',
          action: 'update',
          recordId: id,
          workspaceId: scope.workspaceId,
          userId: scope.userId,
        });
      }
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const profiles = await getAgentProfileSettingsMap();
    const currentSettings = resolveTopicWorkflowSettings({
      maxDocsPerRun: existingTopic.max_docs_per_run,
      minQualityResults: existingTopic.min_quality_results,
      minRelevanceScore: existingTopic.min_relevance_score,
      maxIterations: existingTopic.max_iterations,
      maxQueries: existingTopic.max_queries,
      metadata: existingTopic.metadata,
      profiles,
    });

    const nextSettings = {
      defaultRunMode: isAgentDefaultRunMode(body.defaultRunMode)
        ? body.defaultRunMode
        : currentSettings.defaultRunMode,
      enableCategorizationByDefault:
        typeof body.enableCategorizationByDefault === 'boolean'
          ? body.enableCategorizationByDefault
          : currentSettings.enableCategorizationByDefault,
      skipPublishByDefault:
        typeof body.skipPublishByDefault === 'boolean'
          ? body.skipPublishByDefault
          : currentSettings.skipPublishByDefault,
    };

    const topic = await updateSavedTopic(scope, id, {
      name: typeof body.name === 'string' ? body.name.trim().slice(0, 80) : undefined,
      goal: typeof body.goal === 'string' ? body.goal.trim().slice(0, 500) : undefined,
      focusTags: normalizeFocusTags(body.focusTags),
      maxDocsPerRun:
        typeof body.maxDocsPerRun === 'number'
          ? clampInt(body.maxDocsPerRun, currentSettings.maxDocsPerRun, 1, 20)
          : undefined,
      minQualityResults:
        typeof body.minQualityResults === 'number'
          ? clampInt(body.minQualityResults, currentSettings.minQualityResults, 1, 20)
          : undefined,
      minRelevanceScore:
        typeof body.minRelevanceScore === 'number'
          ? clampScore(body.minRelevanceScore, currentSettings.minRelevanceScore)
          : undefined,
      maxIterations:
        typeof body.maxIterations === 'number'
          ? clampInt(body.maxIterations, currentSettings.maxIterations, 1, 20)
          : undefined,
      maxQueries:
        typeof body.maxQueries === 'number'
          ? clampInt(body.maxQueries, currentSettings.maxQueries, 1, 50)
          : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      isTracked: typeof body.isTracked === 'boolean' ? body.isTracked : undefined,
      cadence:
        body.cadence === 'daily' || body.cadence === 'weekly'
          ? (body.cadence as TopicCadence)
          : undefined,
      metadata: mergeTopicWorkflowMetadata(existingTopic.metadata, {
        workflowSettings: nextSettings,
      }),
    });

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const linkedDocumentCount = await countTopicLinkedDocuments(scope, topic.id);

    return NextResponse.json({
      topic,
      topicOption: {
        id: topic.id,
        name: topic.name,
        goal: topic.goal,
        focusTags: topic.focus_tags ?? [],
        linkedDocumentCount,
        lastRunAt: topic.last_run_at,
        lastRunMode: topic.last_run_mode,
        isTracked: topic.is_tracked,
        isActive: topic.is_active,
        cadence: topic.cadence,
        workflowSettings: resolveTopicWorkflowSettings({
          maxDocsPerRun: topic.max_docs_per_run,
          minQualityResults: topic.min_quality_results,
          minRelevanceScore: topic.min_relevance_score,
          maxIterations: topic.max_iterations,
          maxQueries: topic.max_queries,
          metadata: topic.metadata,
          profiles,
        }),
      },
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return validationErrorResponse(error);
    }
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to update topic') },
      { status: 400 },
    );
  }
}
