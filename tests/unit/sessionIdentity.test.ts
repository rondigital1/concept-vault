import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnsureMembershipContextForUser = vi.hoisted(() => vi.fn());
const mockGetDefaultMembershipContextForUser = vi.hoisted(() => vi.fn());
const mockUpsertUserIdentity = vi.hoisted(() => vi.fn());

vi.mock('@/server/repos/identity.repo', () => ({
  ensureMembershipContextForUser: mockEnsureMembershipContextForUser,
  getDefaultMembershipContextForUser: mockGetDefaultMembershipContextForUser,
  upsertUserIdentity: mockUpsertUserIdentity,
}));

describe('session identity helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps owner-only sign-in in place', async () => {
    const { canSignInWithEmail } = await import('@/server/auth/sessionIdentity');

    expect(
      canSignInWithEmail('owner@example.com', {
        NODE_ENV: 'production',
        OWNER_EMAIL: 'owner@example.com',
      }),
    ).toBe(true);
    expect(
      canSignInWithEmail('member@example.com', {
        NODE_ENV: 'production',
        OWNER_EMAIL: 'owner@example.com',
      }),
    ).toBe(false);
    expect(
      canSignInWithEmail('dev@example.com', {
        NODE_ENV: 'development',
      }),
    ).toBe(true);
  });

  it('hydrates token and session with durable identity fields', async () => {
    const {
      applyIdentityToToken,
      applyTokenToSession,
      hasIdentityClaims,
    } = await import('@/server/auth/sessionIdentity');

    const token = applyIdentityToToken(
      { email: 'owner@example.com', name: 'Owner Name' },
      {
        email: 'owner@example.com',
        membershipRole: 'owner',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        workspaceName: 'Owner Workspace',
        workspaceSlug: 'personal-abc123',
      },
    );

    expect(hasIdentityClaims(token)).toBe(true);

    const session = applyTokenToSession(
      {
        user: {
          name: 'Owner Name',
          image: null,
        },
      },
      token,
    );

    expect(session).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner Name',
        image: null,
        membershipRole: 'owner',
      },
      workspace: {
        id: 'workspace-1',
        name: 'Owner Workspace',
        slug: 'personal-abc123',
      },
    });
  });

  it('prefers durable identity claims for owner access checks but preserves email fallback', async () => {
    const { hasOwnerAccess } = await import('@/server/auth/sessionIdentity');

    expect(
      hasOwnerAccess({
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          membershipRole: 'owner',
        },
        workspace: {
          id: 'workspace-1',
          name: 'Owner Workspace',
          slug: 'personal-abc123',
        },
      }),
    ).toBe(true);

    expect(
      hasOwnerAccess(
        {
          user: {
            email: 'owner@example.com',
          },
        },
        {
          NODE_ENV: 'production',
          OWNER_EMAIL: 'owner@example.com',
        },
      ),
    ).toBe(true);
  });

  it('provisions a durable user and workspace identity when no default membership exists', async () => {
    mockUpsertUserIdentity.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
    mockGetDefaultMembershipContextForUser.mockResolvedValue(null);
    mockEnsureMembershipContextForUser.mockResolvedValue({
      workspace_id: 'workspace-1',
      workspace_name: 'Owner Workspace',
      workspace_slug: 'personal-a1b2c3d4e5f6',
      membership_role: 'owner',
    });

    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    const { resolveSessionIdentity } = await import('@/server/auth/sessionIdentity');
    const identity = await resolveSessionIdentity(
      {
        email: 'Owner@Example.com',
        name: 'Owner',
        image: 'https://example.com/avatar.png',
      },
      logger,
    );

    expect(mockUpsertUserIdentity).toHaveBeenCalledWith({
      email: 'owner@example.com',
      displayName: 'Owner',
      avatarUrl: 'https://example.com/avatar.png',
    });
    expect(mockEnsureMembershipContextForUser).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'owner@example.com',
      workspaceName: 'Owner Workspace',
      workspaceSlug: 'personal-c8cd3c642730',
      role: 'owner',
    });
    expect(identity).toEqual({
      userId: 'user-1',
      email: 'owner@example.com',
      workspaceId: 'workspace-1',
      workspaceName: 'Owner Workspace',
      workspaceSlug: 'personal-a1b2c3d4e5f6',
      membershipRole: 'owner',
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[auth] resolving session identity email=o***r@example.com',
    );
    expect(logger.info).toHaveBeenCalledWith(
      '[auth] resolved session identity email=o***r@example.com userId=user-1 workspaceId=workspace-1 role=owner workspaceSlug=personal-a1b2c3d4e5f6',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
