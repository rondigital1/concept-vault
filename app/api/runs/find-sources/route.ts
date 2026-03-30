import { NextResponse } from 'next/server';
import { client, ensureSchema } from '@/db';
import type { FindSourcesInput } from '@/server/services/findSources.service';
import { findSources } from '@/server/services/findSources.service';
import { publicErrorMessage } from '@/server/security/publicError';

export const runtime = 'nodejs';

type Body = FindSourcesInput;

export async function POST(request: Request) {
  try {
    await ensureSchema(client);
    const body = (await request.json().catch(() => ({}))) as Body;

    const input: FindSourcesInput = {};

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
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Failed to find new sources') },
      { status: 500 },
    );
  }
}
