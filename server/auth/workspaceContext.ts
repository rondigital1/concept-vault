import { auth } from '@/auth';
import { sql } from '@/db';

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

  if (!session?.user?.id || !session.workspace?.id || !session.user.membershipRole) {
    throw new WorkspaceAccessError(401, 'Unauthorized');
  }

  return {
    userId: session.user.id,
    email: typeof session.user.email === 'string' ? session.user.email : null,
    workspaceId: session.workspace.id,
    workspaceName: session.workspace.name,
    workspaceSlug: session.workspace.slug,
    membershipRole: session.user.membershipRole,
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
