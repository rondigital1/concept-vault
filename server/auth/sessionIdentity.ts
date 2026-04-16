import { createHash } from 'node:crypto';
import {
  ensureMembershipContextForUser,
  getDefaultMembershipContextForUser,
  type MembershipRole,
  upsertUserIdentity,
} from '@/server/repos/identity.repo';

export type SessionIdentity = {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  membershipRole: MembershipRole;
};

export type IdentityToken = {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  userId?: string;
  workspaceId?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  membershipRole?: MembershipRole;
};

export type IdentitySession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    membershipRole?: MembershipRole;
  } | null;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
};

type LoggerLike = Pick<typeof console, 'info' | 'error'>;

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function maskEmailForLogs(value: string | null | undefined): string {
  const email = normalizeEmail(value);
  if (!email) {
    return 'unknown';
  }

  const [localPart = '', domain = 'unknown'] = email.split('@');
  if (!localPart) {
    return `*@${domain}`;
  }

  if (localPart.length === 1) {
    return `${localPart}*@${domain}`;
  }

  return `${localPart.slice(0, 1)}***${localPart.slice(-1)}@${domain}`;
}

export function getOwnerEmail(env: NodeJS.ProcessEnv = process.env): string | null {
  return normalizeEmail(env.OWNER_EMAIL);
}

export function canSignInWithEmail(
  candidateEmail: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const normalizedEmail = normalizeEmail(candidateEmail);
  if (!normalizedEmail) {
    return false;
  }

  const ownerEmail = getOwnerEmail(env);
  if (!ownerEmail) {
    if (env.NODE_ENV === 'production') {
      console.error('[auth] OWNER_EMAIL is not set. Rejecting sign-in in production.');
      return false;
    }

    return true;
  }

  return normalizedEmail === ownerEmail;
}

export function hasIdentityClaims(token: IdentityToken | null | undefined): boolean {
  return Boolean(
    token?.userId &&
    token.workspaceId &&
    token.workspaceName &&
    token.workspaceSlug &&
    token.membershipRole,
  );
}

export function hasOwnerAccess(
  session: IdentitySession | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    session?.user?.id &&
    session.workspace?.id &&
    session.user.membershipRole === 'owner'
  ) {
    return true;
  }

  const email = normalizeEmail(session?.user?.email);
  const ownerEmail = getOwnerEmail(env);

  if (!ownerEmail) {
    return env.NODE_ENV !== 'production' && Boolean(email);
  }

  return email === ownerEmail;
}

function shortIdentityHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function titleCaseWord(word: string): string {
  return word ? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}` : word;
}

function deriveWorkspaceName(email: string, displayName?: string | null): string {
  const cleanName = normalizeText(displayName);
  if (cleanName) {
    return `${cleanName} Workspace`;
  }

  const localPart = email.split('@')[0] ?? 'Personal';
  const label = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => titleCaseWord(part))
    .join(' ');

  return `${label || 'Personal'} Workspace`;
}

function deriveWorkspaceSlug(email: string): string {
  return `personal-${shortIdentityHash(email)}`;
}

function buildIdentityLog(identity: SessionIdentity): string {
  return `userId=${identity.userId} workspaceId=${identity.workspaceId} role=${identity.membershipRole} workspaceSlug=${identity.workspaceSlug}`;
}

export async function resolveSessionIdentity(
  input: {
    email: string;
    name?: string | null;
    image?: string | null;
  },
  logger: LoggerLike = console,
): Promise<SessionIdentity> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('Authenticated session is missing an email address');
  }

  const maskedEmail = maskEmailForLogs(email);
  logger.info(`[auth] resolving session identity email=${maskedEmail}`);

  try {
    const user = await upsertUserIdentity({
      email,
      displayName: normalizeText(input.name),
      avatarUrl: normalizeText(input.image),
    });

    const existingMembership = await getDefaultMembershipContextForUser(user.id);
    const membership =
      existingMembership ??
      (await ensureMembershipContextForUser({
        userId: user.id,
        email,
        workspaceName: deriveWorkspaceName(email, input.name),
        workspaceSlug: deriveWorkspaceSlug(email),
        role: 'owner',
      }));

    const identity: SessionIdentity = {
      userId: user.id,
      email: user.email,
      workspaceId: membership.workspace_id,
      workspaceName: membership.workspace_name,
      workspaceSlug: membership.workspace_slug,
      membershipRole: membership.membership_role,
    };

    logger.info(
      `[auth] resolved session identity email=${maskedEmail} ${buildIdentityLog(identity)}`,
    );
    return identity;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[auth] failed to resolve session identity email=${maskedEmail} error=${message}`);
    throw error;
  }
}

export function applyIdentityToToken(
  token: IdentityToken,
  identity: SessionIdentity,
): IdentityToken {
  token.email = identity.email;
  token.userId = identity.userId;
  token.workspaceId = identity.workspaceId;
  token.workspaceName = identity.workspaceName;
  token.workspaceSlug = identity.workspaceSlug;
  token.membershipRole = identity.membershipRole;
  return token;
}

export function applyTokenToSession<TSession extends IdentitySession>(
  session: TSession,
  token: IdentityToken,
): TSession {
  if (!session.user) {
    session.user = {};
  }

  if (typeof token.email === 'string') {
    session.user.email = token.email;
  }
  if (typeof token.userId === 'string') {
    session.user.id = token.userId;
  }
  if (token.membershipRole) {
    session.user.membershipRole = token.membershipRole;
  }

  if (
    typeof token.workspaceId === 'string' &&
    typeof token.workspaceName === 'string' &&
    typeof token.workspaceSlug === 'string'
  ) {
    session.workspace = {
      id: token.workspaceId,
      name: token.workspaceName,
      slug: token.workspaceSlug,
    };
  }

  return session;
}
