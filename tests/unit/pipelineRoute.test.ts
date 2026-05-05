import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetDefaultMembershipContextForUser = vi.hoisted(() => vi.fn());
const mockPipelineFlow = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/server/repos/identity.repo', () => ({
  getDefaultMembershipContextForUser: mockGetDefaultMembershipContextForUser,
}));

vi.mock('@/server/flows/pipeline.flow', () => ({
  pipelineFlow: mockPipelineFlow,
}));

describe('pipeline route', () => {
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
    mockGetDefaultMembershipContextForUser.mockResolvedValue({
      user_id: 'test-user',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: null,
      workspace_id: 'workspace-1',
      workspace_name: 'Test Workspace',
      workspace_slug: 'test-workspace',
      membership_role: 'owner',
      is_default: true,
    });
    mockPipelineFlow.mockResolvedValue({
      runId: 'run-1',
      status: 'ok',
      mode: 'scout_only',
      trigger: 'manual',
      counts: {
        docsTargeted: 0,
        docsCurated: 0,
        docsCurateFailed: 0,
        webProposals: 0,
        analyzedEvidence: 0,
        docsProcessed: 0,
        conceptsProposed: 0,
        flashcardsProposed: 0,
        topicLinksCreated: 0,
      },
      artifacts: {
        webProposalIds: [],
        analysisArtifactIds: [],
        conceptIds: [],
        flashcardIds: [],
      },
      reportId: null,
      notionPageId: null,
      errors: [],
    });
  });

  it('runs valid pipeline requests inline and returns the pipeline result', async () => {
    const { POST } = await import('@/app/api/runs/pipeline/route');
    const response = await POST(
      new Request('http://localhost/api/runs/pipeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-1',
          runMode: 'scout_only',
          maxQueries: 4,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPipelineFlow).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      topicId: 'topic-1',
      runMode: 'scout_only',
      maxQueries: 4,
    });
    await expect(response.json()).resolves.toMatchObject({
      runId: 'run-1',
      status: 'ok',
      mode: 'scout_only',
    });
  });

  it('rejects malformed pipeline requests consistently', async () => {
    const { POST } = await import('@/app/api/runs/pipeline/route');
    const response = await POST(
      new Request('http://localhost/api/runs/pipeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          limit: 'five',
          runMode: 'ship-it',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'limit',
          message: 'limit must be a number',
        }),
        expect.objectContaining({
          path: 'runMode',
          message: 'runMode is invalid',
        }),
      ]),
    });
    expect(mockPipelineFlow).not.toHaveBeenCalled();
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/runs/pipeline')).toBe(1);
  });
});
