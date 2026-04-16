import { NextResponse } from 'next/server';
import { createSavedTopic, listSavedTopics } from '@/server/repos/savedTopics.repo';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import {
  isAgentDefaultRunMode,
  mergeTopicWorkflowMetadata,
} from '@/server/agents/configuration';
import { pipelineFlow } from '@/server/flows/pipeline.flow';
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

function isJsonRequest(contentType: string): boolean {
  return contentType.includes('application/json');
}

function isFormRequest(contentType: string): boolean {
  return (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  );
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['true', '1', 'on', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function formString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === 'string' ? value : undefined;
}

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
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    const topics = await listSavedTopics({ activeOnly });
    return NextResponse.json({ topics });
  } catch (error) {
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
    let body: CreateTopicBody = {};

    if (expectsJson) {
      body = (await request.json()) as CreateTopicBody;
    } else if (isFormRequest(contentType)) {
      const form = await request.formData();
      const rawName = formString(form, 'name');
      const rawGoal = formString(form, 'goal');
      const rawFocusTags = formString(form, 'focusTags');
      const rawMaxDocsPerRun = formString(form, 'maxDocsPerRun');
      const rawMinQualityResults = formString(form, 'minQualityResults');
      const rawMinRelevanceScore = formString(form, 'minRelevanceScore');
      const rawMaxIterations = formString(form, 'maxIterations');
      const rawMaxQueries = formString(form, 'maxQueries');
      const rawIsActive = formString(form, 'isActive');
      const rawIsTracked = formString(form, 'isTracked');
      const rawCadence = formString(form, 'cadence');

      body = {
        name: rawName,
        goal: rawGoal,
        focusTags: typeof rawFocusTags === 'string' ? normalizeFocusTags(rawFocusTags) : undefined,
        maxDocsPerRun: typeof rawMaxDocsPerRun === 'string' ? Number(rawMaxDocsPerRun) : undefined,
        minQualityResults:
          typeof rawMinQualityResults === 'string' ? Number(rawMinQualityResults) : undefined,
        minRelevanceScore:
          typeof rawMinRelevanceScore === 'string' ? Number(rawMinRelevanceScore) : undefined,
        maxIterations: typeof rawMaxIterations === 'string' ? Number(rawMaxIterations) : undefined,
        maxQueries: typeof rawMaxQueries === 'string' ? Number(rawMaxQueries) : undefined,
        isActive: parseBoolean(rawIsActive, true),
        isTracked: parseBoolean(rawIsTracked, false),
        cadence: rawCadence === 'daily' || rawCadence === 'weekly' ? rawCadence : undefined,
      };
    }

    const name = typeof body.name === 'string' ? normalizeTopicName(body.name) : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';

    if (!name) {
      if (!expectsJson) {
        return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
      }
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!goal) {
      if (!expectsJson) {
        return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
      }
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }

    const profiles = await getAgentProfileSettingsMap();
    const topic = await createSavedTopic({
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
    try {
      const setupResult = await pipelineFlow({
        topicId: topic.id,
        runMode: 'topic_setup',
        trigger: 'auto_topic',
        enableCategorization: false,
        idempotencyKey: `topic_setup:${topic.id}:${new Date().toISOString().slice(0, 10)}`,
      });
      setupRunId = setupResult.runId;
    } catch (setupError) {
      console.error('Topic setup pipeline failed:', setupError);
    }

    if (!expectsJson) {
      return NextResponse.redirect(new URL(RESEARCH_FALLBACK_PATH, request.url), { status: 303 });
    }

    return NextResponse.json({ topic, setupRunId }, { status: 201 });
  } catch (error) {
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
