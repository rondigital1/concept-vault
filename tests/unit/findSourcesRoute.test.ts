import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_DAY } from '../helpers/fixtures';

const mockFindSources = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());

vi.mock('@/server/services/findSources.service', () => ({
  findSources: mockFindSources,
}));

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

describe('find sources route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        membershipRole: 'owner',
      },
      workspace: {
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
      },
    });
  });

  it('parses and forwards a single-topic request', async () => {
    const payload = {
      runId: 'run-1',
      status: 'ok',
      mode: 'scout_only',
      trigger: 'manual',
      counts: {
        docsTargeted: 0,
        docsCurated: 0,
        docsCurateFailed: 0,
        webProposals: 2,
        analyzedEvidence: 2,
        docsProcessed: 0,
        conceptsProposed: 0,
        flashcardsProposed: 0,
        topicLinksCreated: 0,
      },
      artifacts: {
        webProposalIds: ['artifact-1'],
        analysisArtifactIds: [],
        conceptIds: [],
        flashcardIds: [],
      },
      reportId: null,
      notionPageId: null,
      errors: [],
    };
    mockFindSources.mockResolvedValue(payload);

    const { POST } = await import('@/app/api/runs/find-sources/route');

    const response = await POST(
      new Request('http://localhost/api/runs/find-sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          day: TEST_DAY,
          topicId: 'topic-1',
          minQualityResults: 4,
        }),
      }),
    );

    expect(mockFindSources).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      day: TEST_DAY,
      topicId: 'topic-1',
      minQualityResults: 4,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
  });

  it('parses and forwards an all-topics batch request', async () => {
    const payload = {
      mode: 'batch',
      scope: 'all_topics',
      day: TEST_DAY,
      counts: {
        topicsEligible: 3,
        topicsProcessed: 2,
        topicsSucceeded: 2,
        topicsFailed: 0,
        webProposals: 5,
      },
      runs: [],
    };
    mockFindSources.mockResolvedValue(payload);

    const { POST } = await import('@/app/api/runs/find-sources/route');

    const response = await POST(
      new Request('http://localhost/api/runs/find-sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          day: TEST_DAY,
          scope: 'all_topics',
          maxTopics: 2,
          minRelevanceScore: 0.85,
        }),
      }),
    );

    expect(mockFindSources).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      day: TEST_DAY,
      scope: 'all_topics',
      maxTopics: 2,
      minRelevanceScore: 0.85,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(payload);
  });

  it('rejects malformed requests consistently', async () => {
    const { POST } = await import('@/app/api/runs/find-sources/route');

    const response = await POST(
      new Request('http://localhost/api/runs/find-sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'everywhere',
          maxTopics: 'bad',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'scope',
          message: 'scope must be topic or all_topics',
        }),
        expect.objectContaining({
          path: 'maxTopics',
          message: 'maxTopics must be a number',
        }),
      ]),
    });
    expect(mockFindSources).not.toHaveBeenCalled();
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/runs/find-sources')).toBe(1);
  });
});
