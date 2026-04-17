import { NextResponse } from 'next/server';
import { WorkspaceAccessError, requireSessionWorkspace } from '@/server/auth/workspaceContext';
import { createTopicRequestSchema } from '@/server/http/requestSchemas';
import {
  formString,
  isFormRequest,
  isJsonRequest,
  parseBooleanFlag,
  parseFormRequest,
  parseJsonRequest,
  parseNumberFromForm,
  RequestValidationError,
  validationErrorResponse,
} from '@/server/http/requestValidation';
import { createSavedTopic, listSavedTopics } from '@/server/repos/savedTopics.repo';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import {
  isAgentDefaultRunMode,
  mergeTopicWorkflowMetadata,
} from '@/server/agents/configuration';
import {
  enqueuePipelineJob,
  executePipelineInline,
  isPipelineInlineExecutionEnabled,
  schedulePipelineJobDrain,
} from '@/server/jobs/pipelineJobs';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

const RESEARCH_FALLBACK_PATH = '/today';
const TOPIC_ACRONYMS = new Set(['ai', 'api', 'apis', 'css', 'html', 'js', 'json', 'llm', 'llms', 'sdk', 'sql', 'ui', 'ux']);

type CreateTopicBody = {
  name?: string;
  goal?: string;
  focusTags?: string[];
  maxDocsPerRun?: number;
  minQualityResults?: number;
  minRelevanceScore?: number;
  maxIterations?: number;
  maxQueries?: number;
  isActive?: boolean;
  isTracked?: boolean;
  cadence?: 'daily' | 'weekly';
  defaultRunMode?: string;
  enableCategorizationByDefault?: boolean;
  skipPublishByDefault?: boolean;
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(Math.floor(parsed), max));
}

function clampScore(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(parsed, 1));
}

function normalizeFocusTags(value: unknown): string[] {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  if (rawTags.length === 0) {
    return [];
  }

  const cleaned = rawTags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.toLowerCase().trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/\s+/g, ' '))
    .filter((tag) => tag.length >= 2 && tag.length <= 40);

  return [...new Set(cleaned)].slice(0, 10);
}

function hasSuspiciousTopicCasing(value: string): boolean {
  return /[A-Z]{2,}[a-z]|[a-z][A-Z]{2,}/.test(value);
}

function normalizeTopicToken(token: string): string {
  return token
    .split(/([+./-])/)
    .map((part) => {
      if (!part || ['+', '.', '/', '-'].includes(part)) {
        return part;
      }

      const lower = part.toLowerCase();
      if (TOPIC_ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }
      if (/^\d+$/.test(part)) {
        return part;
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function normalizeTopicName(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return '';
  }
  if (!hasSuspiciousTopicCasing(collapsed)) {
    return collapsed;
  }

  return collapsed
    .split(' ')
    .map((token) => normalizeTopicToken(token))
    .join(' ');
}

export async function GET(request: Request) {
  try {
    const scope = await requireSessionWorkspace();
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    const topics = await listSavedTopics(scope, { activeOnly });
    return NextResponse.json({ topics });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error listing saved topics:', error);
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to list topics') },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    const scope = await requireSessionWorkspace();
    let body: CreateTopicBody;

    if (expectsJson) {
      body = await parseJsonRequest(request, createTopicRequestSchema, {
        route: '/api/topics',
      });
    } else if (isFormRequest(contentType)) {
      body = await parseFormRequest(request, createTopicRequestSchema, {
        route: '/api/topics',
        mapFormData: (form) => ({
          name: formString(form, 'name'),
          goal: formString(form, 'goal'),
          focusTags: normalizeFocusTags(formString(form, 'focusTags')),
          maxDocsPerRun: parseNumberFromForm(form.get('maxDocsPerRun')),
          minQualityResults: parseNumberFromForm(form.get('minQualityResults')),
          minRelevanceScore: parseNumberFromForm(form.get('minRelevanceScore')),
          maxIterations: parseNumberFromForm(form.get('maxIterations')),
          maxQueries: parseNumberFromForm(form.get('maxQueries')),
          isActive: parseBooleanFlag(form.get('isActive')) ?? true,
          isTracked: parseBooleanFlag(form.get('isTracked')) ?? false,
          cadence: formString(form, 'cadence'),
          defaultRunMode: formString(form, 'defaultRunMode'),
          enableCategorizationByDefault: parseBooleanFlag(form.get('enableCategorizationByDefault')),
          skipPublishByDefault: parseBooleanFlag(form.get('skipPublishByDefault')),
        }),
      });
    } else {
      body = await parseJsonRequest(request, createTopicRequestSchema, {
        route: '/api/topics',
      });
    }

    const name = normalizeTopicName(body.name ?? '');
    const goal = body.goal?.trim() ?? '';

    const profiles = await getAgentProfileSettingsMap();
    const topic = await createSavedTopic({
      workspaceId: scope.workspaceId,
      name: name.slice(0, 80),
      goal: goal.slice(0, 500),
      focusTags: normalizeFocusTags(body.focusTags),
      maxDocsPerRun: clampInt(
        body.maxDocsPerRun,
        profiles.distiller.maxDocsPerRun,
        1,
        20,
      ),
      minQualityResults: clampInt(
        body.minQualityResults,
        profiles.webScout.minQualityResults,
        1,
        20,
      ),
      minRelevanceScore: clampScore(
        body.minRelevanceScore,
        profiles.webScout.minRelevanceScore,
      ),
      maxIterations: clampInt(body.maxIterations, profiles.webScout.maxIterations, 1, 20),
      maxQueries: clampInt(body.maxQueries, profiles.webScout.maxQueries, 1, 50),
      isActive: body.isActive !== false,
      isTracked: body.isTracked === true,
      cadence: body.cadence === 'daily' ? 'daily' : 'weekly',
      metadata: mergeTopicWorkflowMetadata(
        {},
        {
          workflowSettings: {
            defaultRunMode: isAgentDefaultRunMode(body.defaultRunMode)
              ? body.defaultRunMode
              : profiles.pipeline.defaultRunMode,
            enableCategorizationByDefault:
              typeof body.enableCategorizationByDefault === 'boolean'
                ? body.enableCategorizationByDefault
                : profiles.curator.enableCategorizationByDefault,
            skipPublishByDefault:
              typeof body.skipPublishByDefault === 'boolean'
                ? body.skipPublishByDefault
                : profiles.pipeline.skipPublishByDefault,
          },
        },
      ),
    });

    let setupRunId: string | null = null;
    let setupJobId: string | null = null;
    try {
      const setupInput = {
        workspaceId: scope.workspaceId,
        topicId: topic.id,
        runMode: 'topic_setup' as const,
        trigger: 'auto_topic' as const,
        enableCategorization: false,
        idempotencyKey: `topic_setup:${topic.id}:${new Date().toISOString().slice(0, 10)}`,
      };

      if (isPipelineInlineExecutionEnabled()) {
        const setupResult = await executePipelineInline(setupInput);
        setupRunId = setupResult.runId;
      } else {
        const queued = await enqueuePipelineJob({
          scope,
          route: '/api/topics',
          input: setupInput,
        });
        setupRunId = queued.runId;
        setupJobId = queued.jobId;

        schedulePipelineJobDrain();
      }
    } catch (setupError) {
      console.error('Topic setup pipeline failed:', setupError);
    }

    if (!expectsJson) {
      return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
    }

    return NextResponse.json({ topic, setupRunId, setupJobId }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      if (!expectsJson) {
        return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
      }
      return validationErrorResponse(error);
    }
    if (error instanceof WorkspaceAccessError) {
      if (!expectsJson) {
        return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const internalMessage = error instanceof Error ? error.message : String(error);
    const isDuplicate = internalMessage.includes('saved_topics_name_key');

    if (!expectsJson) {
      return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
    }

    return NextResponse.json(
      {
        error: isDuplicate
          ? 'A topic with this name already exists'
          : publicErrorMessage(error, 'Failed to create topic'),
      },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}
