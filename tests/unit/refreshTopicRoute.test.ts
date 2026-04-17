import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockDrainPipelineJobQueue = vi.hoisted(() => vi.fn());
const mockEnqueuePipelineJob = vi.hoisted(() => vi.fn());
const mockExecutePipelineInline = vi.hoisted(() => vi.fn());
const mockGetDefaultMembershipContextForUser = vi.hoisted(() => vi.fn());
const mockSchedulePipelineJobDrain = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/server/repos/identity.repo', () => ({
  getDefaultMembershipContextForUser: mockGetDefaultMembershipContextForUser,
}));

vi.mock('@/server/jobs/pipelineJobs', () => ({
  drainPipelineJobQueue: mockDrainPipelineJobQueue,
  enqueuePipelineJob: mockEnqueuePipelineJob,
  executePipelineInline: mockExecutePipelineInline,
  isPipelineInlineExecutionEnabled: () => false,
  schedulePipelineJobDrain: mockSchedulePipelineJobDrain,
}));

describe('refresh topic route', () => {
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
    mockEnqueuePipelineJob.mockResolvedValue({
      jobId: 'job-1',
      runId: 'run-1',
      status: 'queued',
      reused: false,
      queueDepth: 1,
    });
  });

  it('forwards valid refresh requests', async () => {
    const { POST } = await import('@/app/api/runs/refresh-topic/route');
    const response = await POST(
      new Request('http://localhost/api/runs/refresh-topic', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topicId: 'topic-1',
          mode: 'scout_only',
        }),
      }),
    );

    expect(response.status).toBe(202);
    expect(mockEnqueuePipelineJob).toHaveBeenCalledWith({
      scope: expect.objectContaining({ workspaceId: 'workspace-1' }),
      route: '/api/runs/refresh-topic',
      input: {
        workspaceId: 'workspace-1',
        trigger: 'manual',
        runMode: 'scout_only',
        topicId: 'topic-1',
        enableCategorization: true,
      },
    });
  });

  it('rejects malformed refresh requests consistently', async () => {
    const { POST } = await import('@/app/api/runs/refresh-topic/route');
    const response = await POST(
      new Request('http://localhost/api/runs/refresh-topic', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topicId: '',
          mode: 'bad-mode',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'topicId',
          message: 'topicId is required',
        }),
        expect.objectContaining({
          path: 'mode',
          message: 'mode is invalid',
        }),
      ]),
    });
    expect(mockEnqueuePipelineJob).not.toHaveBeenCalled();
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/runs/refresh-topic')).toBe(1);
  });
});
