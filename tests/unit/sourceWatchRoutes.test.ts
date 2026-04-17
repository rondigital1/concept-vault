import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockCreateSourceWatch = vi.hoisted(() => vi.fn());
const mockGetDefaultMembershipContextForUser = vi.hoisted(() => vi.fn());
const mockUpdateSourceWatch = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/server/repos/identity.repo', () => ({
  getDefaultMembershipContextForUser: mockGetDefaultMembershipContextForUser,
}));

vi.mock('@/server/services/sourceWatch.service', () => ({
  listSourceWatch: vi.fn(),
  createSourceWatch: mockCreateSourceWatch,
  updateSourceWatch: mockUpdateSourceWatch,
  deleteSourceWatch: vi.fn(),
}));

vi.mock('@/server/auth/authzAudit', () => ({
  detectWorkspaceAccess: vi.fn(),
  recordAuthorizationDenied: vi.fn(),
}));

describe('source watch routes', () => {
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
  });

  it('creates source watch items from valid payloads', async () => {
    mockCreateSourceWatch.mockResolvedValue({
      id: 'watch-1',
      url: 'https://example.com',
      domain: 'example.com',
      label: 'Example',
      kind: 'source',
      isActive: true,
      checkIntervalHours: 24,
      lastCheckedAt: null,
      createdAt: '2026-04-16T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
    });

    const { POST } = await import('@/app/api/source-watch/route');
    const response = await POST(
      new Request('http://localhost/api/source-watch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          label: 'Example',
          kind: 'weird-custom-kind',
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateSourceWatch).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'workspace-1' }),
      expect.objectContaining({
        url: 'https://example.com',
        label: 'Example',
        kind: 'weird-custom-kind',
      }),
    );
  });

  it('rejects malformed update payloads consistently', async () => {
    const { PATCH } = await import('@/app/api/source-watch/[id]/route');
    const response = await PATCH(
      new Request('http://localhost/api/source-watch/watch-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          isActive: 'yes',
          checkIntervalHours: 'daily',
        }),
      }),
      {
        params: Promise.resolve({ id: 'watch-1' }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request payload',
      details: expect.arrayContaining([
        expect.objectContaining({
          path: 'isActive',
          message: 'isActive must be a boolean',
        }),
        expect.objectContaining({
          path: 'checkIntervalHours',
          message: 'checkIntervalHours must be a number',
        }),
      ]),
    });
    expect(mockUpdateSourceWatch).not.toHaveBeenCalled();
    const validation = await import('@/server/http/requestValidation');
    expect(validation.getValidationFailureCount('/api/source-watch/[id]', 'PATCH')).toBe(1);
  });
});
