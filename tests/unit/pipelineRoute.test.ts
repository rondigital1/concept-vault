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
    mockEnqueuePipelineJob.mockResolvedValue({
      jobId: 'job-1',
      runId: 'run-1',
      status: 'queued',
      reused: false,
      queueDepth: 1,
    });
    mockDrainPipelineJobQueue.mockResolvedValue({
      processed: 1,
      completed: 1,
      retried: 0,
      failed: 0,
      workerId: 'worker-1',
    });
  });

  it('enqueues valid pipeline requests and returns the queued run id', async () => {
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

    expect(response.status).toBe(202);
    expect(mockEnqueuePipelineJob).toHaveBeenCalledWith({
      scope: expect.objectContaining({ workspaceId: 'workspace-1' }),
      route: '/api/runs/pipeline',
      input: {
        workspaceId: 'workspace-1',
        topicId: 'topic-1',
        runMode: 'scout_only',
        maxQueries: 4,
      },
    });
    await expect(response.json()).resolves.toEqual({
      jobId: 'job-1',
      runId: 'run-1',
      status: 'queued',
      reused: false,
      queueDepth: 1,
    });
    expect(mockExecutePipelineInline).not.toHaveBeenCalled();
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
    expect(mockEnqueuePipelineJob).not.toHaveBeenCalled();
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/runs/pipeline')).toBe(1);
  });
});
