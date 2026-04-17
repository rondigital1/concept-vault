import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetDefaultMembershipContextForUser = vi.hoisted(() => vi.fn());
const mockResolveSessionIdentity = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/server/repos/identity.repo', () => ({
  getDefaultMembershipContextForUser: mockGetDefaultMembershipContextForUser,
}));

vi.mock('@/server/auth/sessionIdentity', () => ({
  resolveSessionIdentity: mockResolveSessionIdentity,
}));

describe('workspaceContext.requireSessionWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the persisted membership context over stale session claims', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'stale-user-id',
        email: 'owner@example.com',
        name: 'Owner',
        image: 'https://example.com/avatar.png',
        membershipRole: 'owner',
      },
      workspace: {
        id: 'stale-workspace-id',
        name: 'Stale Workspace',
        slug: 'stale-workspace',
      },
    });
    mockGetDefaultMembershipContextForUser.mockResolvedValue({
      user_id: 'stale-user-id',
      email: 'owner@example.com',
      display_name: 'Owner',
      avatar_url: 'https://example.com/avatar.png',
      workspace_id: 'workspace-1',
      workspace_name: 'Recovered Workspace',
      workspace_slug: 'recovered-workspace',
      membership_role: 'owner',
      is_default: true,
    });

    const { requireSessionWorkspace } = await import('@/server/auth/workspaceContext');
    await expect(requireSessionWorkspace()).resolves.toEqual({
      userId: 'stale-user-id',
      email: 'owner@example.com',
      workspaceId: 'workspace-1',
      workspaceName: 'Recovered Workspace',
      workspaceSlug: 'recovered-workspace',
      membershipRole: 'owner',
    });

    expect(mockGetDefaultMembershipContextForUser).toHaveBeenCalledWith('stale-user-id');
    expect(mockResolveSessionIdentity).not.toHaveBeenCalled();
  });

  it('rebuilds the workspace context when the persisted membership is missing', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'stale-user-id',
        email: 'owner@example.com',
        name: 'Owner',
        image: 'https://example.com/avatar.png',
        membershipRole: 'owner',
      },
      workspace: {
        id: 'missing-workspace-id',
        name: 'Missing Workspace',
        slug: 'missing-workspace',
      },
    });
    mockGetDefaultMembershipContextForUser.mockResolvedValue(null);
    mockResolveSessionIdentity.mockResolvedValue({
      userId: 'fresh-user-id',
      email: 'owner@example.com',
      workspaceId: 'fresh-workspace-id',
      workspaceName: 'Fresh Workspace',
      workspaceSlug: 'fresh-workspace',
      membershipRole: 'owner',
    });

    const { requireSessionWorkspace } = await import('@/server/auth/workspaceContext');
    await expect(requireSessionWorkspace()).resolves.toEqual({
      userId: 'fresh-user-id',
      email: 'owner@example.com',
      workspaceId: 'fresh-workspace-id',
      workspaceName: 'Fresh Workspace',
      workspaceSlug: 'fresh-workspace',
      membershipRole: 'owner',
    });

    expect(mockResolveSessionIdentity).toHaveBeenCalledWith({
      email: 'owner@example.com',
      name: 'Owner',
      image: 'https://example.com/avatar.png',
    });
  });

  it('rejects sessions that cannot be tied back to a user email', async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: null,
        membershipRole: 'owner',
      },
      workspace: {
        id: 'workspace-1',
        name: 'Workspace',
        slug: 'workspace',
      },
    });

    const { requireSessionWorkspace } = await import('@/server/auth/workspaceContext');

    await expect(requireSessionWorkspace()).rejects.toEqual(
      expect.objectContaining({
        name: 'WorkspaceAccessError',
        status: 401,
        message: 'Unauthorized',
      }),
    );
  });
});
