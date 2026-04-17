import { auth } from '@/auth';
import { sql } from '@/db';
import { getDefaultMembershipContextForUser } from '@/server/repos/identity.repo';
import { resolveSessionIdentity } from '@/server/auth/sessionIdentity';

export type WorkspaceScope = {
  workspaceId: string;
};

export type SessionWorkspaceContext = WorkspaceScope & {
  userId: string;
  email: string | null;
  workspaceName: string;
  workspaceSlug: string;
  membershipRole: 'owner' | 'member';
};

export class WorkspaceAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'WorkspaceAccessError';
    this.status = status;
  }
}

export async function requireSessionWorkspace(): Promise<SessionWorkspaceContext> {
  const session = await auth();

  const email =
    typeof session?.user?.email === 'string' && session.user.email.trim().length > 0
      ? session.user.email.trim()
      : null;

  if (!session?.user?.id || !email) {
    throw new WorkspaceAccessError(401, 'Unauthorized');
  }

  const persistedMembership = await getDefaultMembershipContextForUser(session.user.id);

  if (persistedMembership) {
    return {
      userId: persistedMembership.user_id,
      email: persistedMembership.email,
      workspaceId: persistedMembership.workspace_id,
      workspaceName: persistedMembership.workspace_name,
      workspaceSlug: persistedMembership.workspace_slug,
      membershipRole: persistedMembership.membership_role,
    };
  }

  const recoveredIdentity = await resolveSessionIdentity({
    email,
    name: typeof session.user.name === 'string' ? session.user.name : null,
    image: typeof session.user.image === 'string' ? session.user.image : null,
  });

  return {
    userId: recoveredIdentity.userId,
    email: recoveredIdentity.email,
    workspaceId: recoveredIdentity.workspaceId,
    workspaceName: recoveredIdentity.workspaceName,
    workspaceSlug: recoveredIdentity.workspaceSlug,
    membershipRole: recoveredIdentity.membershipRole,
  };
}

export async function resolveDefaultWorkspaceScope(): Promise<WorkspaceScope> {
  const membershipRows = await sql<Array<{ workspace_id: string }>>`
    SELECT workspace_id
    FROM memberships
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `;

  if (membershipRows[0]?.workspace_id) {
    return { workspaceId: membershipRows[0].workspace_id };
  }

  const workspaceRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM workspaces
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (workspaceRows[0]?.id) {
    return { workspaceId: workspaceRows[0].id };
  }

  throw new WorkspaceAccessError(503, 'No workspace is available');
}
