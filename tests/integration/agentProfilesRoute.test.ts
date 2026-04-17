import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getAgentProfileSettingsMap } from '@/server/repos/agentProfiles.repo';
import { cleanAllTables, closeTestDb, initTestSchema } from '../helpers/testDb';

describe('agent profiles route', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
    const validation = await import('@/server/http/requestValidation');
    validation.resetValidationFailureCounts();
  });

  it('updates and normalizes global agent defaults', async () => {
    const { PATCH } = await import('@/app/api/agents/profiles/[agentKey]/route');

    const response = await PATCH(
      new Request('http://localhost/api/agents/profiles/webScout', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          minQualityResults: 9,
          minRelevanceScore: 1.4,
          maxIterations: 0,
          maxQueries: 99,
        }),
      }),
      {
        params: Promise.resolve({ agentKey: 'webScout' }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      profile: {
        agentKey: 'webScout',
        settings: {
          minQualityResults: 9,
          minRelevanceScore: 1,
          maxIterations: 1,
          maxQueries: 50,
        },
      },
    });

    const profiles = await getAgentProfileSettingsMap();
    expect(profiles.webScout).toEqual({
      minQualityResults: 9,
      minRelevanceScore: 1,
      maxIterations: 1,
      maxQueries: 50,
    });
  });

  it('returns 404 for an unknown agent profile key', async () => {
    const { PATCH } = await import('@/app/api/agents/profiles/[agentKey]/route');

    const response = await PATCH(
      new Request('http://localhost/api/agents/profiles/unknown', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
      {
        params: Promise.resolve({ agentKey: 'unknown' }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Unknown agent profile' });
  });

  it('rejects malformed profile payloads consistently', async () => {
    const { PATCH } = await import('@/app/api/agents/profiles/[agentKey]/route');

    const response = await PATCH(
      new Request('http://localhost/api/agents/profiles/webScout', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(['not-an-object']),
      }),
      {
        params: Promise.resolve({ agentKey: 'webScout' }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: '$',
        }),
      ]),
    });
  });
});
