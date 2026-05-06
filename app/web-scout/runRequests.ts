import { parseNumberParam, todayISODate } from './formatting';
import type { BatchFindSourcesResult, QueryParamReader } from './types';

function buildRunPayload(searchParams: QueryParamReader): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    day: searchParams.get('day') ?? todayISODate(),
    trigger: 'manual',
  };

  const topicId = searchParams.get('topicId');
  if (topicId) {
    payload.topicId = topicId;
  }

  const goal = searchParams.get('goal');
  if (goal) {
    payload.goal = goal;
  }

  const limit = parseNumberParam(searchParams.get('limit'));
  if (limit !== null) {
    payload.limit = limit;
  }

  const minQualityResults = parseNumberParam(searchParams.get('minQualityResults'));
  if (minQualityResults !== null) {
    payload.minQualityResults = minQualityResults;
  }

  const minRelevanceScore = parseNumberParam(searchParams.get('minRelevanceScore'));
  if (minRelevanceScore !== null) {
    payload.minRelevanceScore = minRelevanceScore;
  }

  const maxIterations = parseNumberParam(searchParams.get('maxIterations'));
  if (maxIterations !== null) {
    payload.maxIterations = maxIterations;
  }

  const maxQueries = parseNumberParam(searchParams.get('maxQueries'));
  if (maxQueries !== null) {
    payload.maxQueries = maxQueries;
  }

  const runMode = searchParams.get('runMode');
  if (runMode) {
    payload.runMode = runMode;
  }

  return payload;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error || fallback;
}

export async function startBatchFindSourcesRun(
  searchParams: QueryParamReader,
): Promise<BatchFindSourcesResult> {
  const payload = buildRunPayload(searchParams);
  payload.scope = 'all_topics';

  const maxTopics = parseNumberParam(searchParams.get('maxTopics'));
  if (maxTopics !== null) {
    payload.maxTopics = maxTopics;
  }

  const response = await fetch('/api/runs/find-sources', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to run Find Sources batch'));
  }

  return response.json() as Promise<BatchFindSourcesResult>;
}

export async function startPipelineRun(searchParams: QueryParamReader): Promise<string> {
  const response = await fetch('/api/runs/pipeline', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildRunPayload(searchParams)),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to start pipeline run'));
  }

  const body = (await response.json()) as { runId: string };
  return body.runId;
}
