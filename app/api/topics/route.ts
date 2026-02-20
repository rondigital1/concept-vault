import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import { createSavedTopic, listSavedTopics } from '@/server/repos/savedTopics.repo';

export const runtime = 'nodejs';

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

export async function GET(request: Request) {
  try {
    await ensureSchema(client);
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    const topics = await listSavedTopics({ activeOnly });
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error listing saved topics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list topics' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const expectsJson = isJsonRequest(contentType);

  try {
    await ensureSchema(client);
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
      };
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';

    if (!name) {
      if (!expectsJson) {
        return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
      }
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!goal) {
      if (!expectsJson) {
        return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
      }
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }

    const topic = await createSavedTopic({
      name: name.slice(0, 80),
      goal: goal.slice(0, 500),
      focusTags: normalizeFocusTags(body.focusTags),
      maxDocsPerRun: clampInt(body.maxDocsPerRun, 5, 1, 20),
      minQualityResults: clampInt(body.minQualityResults, 3, 1, 20),
      minRelevanceScore: clampScore(body.minRelevanceScore, 0.8),
      maxIterations: clampInt(body.maxIterations, 5, 1, 20),
      maxQueries: clampInt(body.maxQueries, 10, 1, 50),
      isActive: body.isActive !== false,
    });

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
    }

    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isDuplicate = message.includes('saved_topics_name_key');

    if (!expectsJson) {
      return NextResponse.redirect(new URL('/agent-control-center', request.url), { status: 303 });
    }

    return NextResponse.json(
      { error: isDuplicate ? 'A topic with this name already exists' : message },
      { status: isDuplicate ? 409 : 500 },
    );
  }
}
