import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { updateAgentProfile } from '@/server/repos/agentProfiles.repo';
import { createSavedTopic, getSavedTopicsByIds } from '@/server/repos/savedTopics.repo';
import { cleanAllTables, closeTestDb, initTestSchema } from '../helpers/testDb';

describe('topic patch route', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
  });

  it('updates explicit topic workflow overrides while preserving global fallbacks', async () => {
    await updateAgentProfile('pipeline', {
      defaultRunMode: 'incremental_update',
      skipPublishByDefault: true,
    });
    await updateAgentProfile('curator', {
      enableCategorizationByDefault: true,
    });
    await updateAgentProfile('webScout', {
      minQualityResults: 7,
      minRelevanceScore: 0.88,
      maxIterations: 6,
      maxQueries: 11,
    });
    await updateAgentProfile('distiller', {
      maxDocsPerRun: 8,
    });

    const topic = await createSavedTopic({
      name: 'Agent Operations',
      goal: 'Track vault automation quality',
      focusTags: ['agents', 'operations'],
      maxDocsPerRun: 5,
      minQualityResults: 4,
      minRelevanceScore: 0.75,
      maxIterations: 4,
      maxQueries: 9,
      metadata: {
        source: 'test-suite',
      },
    });

    const { PATCH } = await import('@/app/api/topics/[id]/route');

    const response = await PATCH(
      new Request(`http://localhost/api/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enableCategorizationByDefault: false,
          maxQueries: 13,
          cadence: 'daily',
          isTracked: true,
        }),
      }),
      {
        params: Promise.resolve({ id: topic.id }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.topicOption.workflowSettings).toMatchObject({
      defaultRunMode: 'incremental_update',
      enableCategorizationByDefault: false,
      skipPublishByDefault: true,
      maxDocsPerRun: 5,
      minQualityResults: 4,
      minRelevanceScore: 0.75,
      maxIterations: 4,
      maxQueries: 13,
    });
    expect(body.topicOption.cadence).toBe('daily');
    expect(body.topicOption.isTracked).toBe(true);

    const updated = (await getSavedTopicsByIds([topic.id]))[0];
    expect(updated?.cadence).toBe('daily');
    expect(updated?.is_tracked).toBe(true);
    expect(updated?.metadata).toMatchObject({
      source: 'test-suite',
      workflowSettings: {
        defaultRunMode: 'incremental_update',
        enableCategorizationByDefault: false,
        skipPublishByDefault: true,
      },
    });
  });
});
