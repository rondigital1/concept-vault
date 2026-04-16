import { sql } from '@/db';

export type MembershipRole = 'owner' | 'member';

export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  last_authenticated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipContextRow {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  membership_role: MembershipRole;
  is_default: boolean;
}

type SqlExecutor = typeof sql;

function rowSelection(executor: SqlExecutor) {
  return executor`
    u.id AS user_id,
    u.email,
    u.display_name,
    u.avatar_url,
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.slug AS workspace_slug,
    m.role AS membership_role,
    m.is_default
  `;
}

async function getPreferredMembership(
  executor: SqlExecutor,
  userId: string,
): Promise<MembershipContextRow | null> {
  const rows = await executor<MembershipContextRow[]>`
    SELECT ${rowSelection(executor)}
    FROM memberships m
    INNER JOIN users u ON u.id = m.user_id
    INNER JOIN workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = ${userId}
    ORDER BY m.is_default DESC, m.created_at ASC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function upsertUserIdentity(input: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<UserRow> {
  const rows = await sql<UserRow[]>`
    INSERT INTO users (
      email,
      display_name,
      avatar_url,
      last_authenticated_at,
      updated_at
    )
    VALUES (
      ${input.email},
      ${input.displayName ?? null},
      ${input.avatarUrl ?? null},
      now(),
      now()
    )
    ON CONFLICT (email)
    DO UPDATE
      SET display_name = COALESCE(EXCLUDED.display_name, users.display_name),
          avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
          last_authenticated_at = now(),
          updated_at = now()
    RETURNING id, email, display_name, avatar_url, last_authenticated_at, created_at, updated_at
  `;

  return rows[0];
}

export async function getDefaultMembershipContextForUser(
  userId: string,
): Promise<MembershipContextRow | null> {
  const rows = await sql<MembershipContextRow[]>`
    SELECT ${rowSelection(sql)}
    FROM memberships m
    INNER JOIN users u ON u.id = m.user_id
    INNER JOIN workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = ${userId}
      AND m.is_default = true
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function ensureMembershipContextForUser(input: {
  userId: string;
  email: string;
  workspaceName: string;
  workspaceSlug: string;
  role: MembershipRole;
}): Promise<MembershipContextRow> {
  return sql.begin(async (tx) => {
    const txSql = tx as unknown as SqlExecutor;
    const existingMembership = await getPreferredMembership(txSql, input.userId);

    if (existingMembership) {
      await txSql`
        UPDATE memberships
        SET
          role = ${input.role},
          is_default = true,
          updated_at = now()
        WHERE user_id = ${input.userId}
          AND workspace_id = ${existingMembership.workspace_id}
      `;

      await txSql`
        UPDATE memberships
        SET is_default = false, updated_at = now()
        WHERE user_id = ${input.userId}
          AND workspace_id <> ${existingMembership.workspace_id}
          AND is_default = true
      `;

      if (existingMembership.membership_role === 'owner') {
        await txSql`
          UPDATE workspaces
          SET owner_user_id = ${input.userId}, updated_at = now()
          WHERE id = ${existingMembership.workspace_id}
            AND owner_user_id IS DISTINCT FROM ${input.userId}
        `;
      }

      const refreshed = await getPreferredMembership(txSql, input.userId);
      if (!refreshed) {
        throw new Error('Failed to reload membership context after update');
      }
      return refreshed;
    }

    const workspaceRows = await txSql<Array<{ id: string }>>`
      INSERT INTO workspaces (slug, name, owner_user_id, updated_at)
      VALUES (
        ${input.workspaceSlug},
        ${input.workspaceName},
        ${input.role === 'owner' ? input.userId : null},
        now()
      )
      ON CONFLICT (slug)
      DO UPDATE
        SET name = COALESCE(workspaces.name, EXCLUDED.name),
            owner_user_id = COALESCE(workspaces.owner_user_id, EXCLUDED.owner_user_id),
            updated_at = now()
      RETURNING id
    `;

    const workspaceId = workspaceRows[0]?.id;
    if (!workspaceId) {
      throw new Error('Failed to create or reuse workspace for authenticated session');
    }

    await txSql`
      UPDATE memberships
      SET is_default = false, updated_at = now()
      WHERE user_id = ${input.userId}
        AND is_default = true
    `;

    await txSql`
      INSERT INTO memberships (user_id, workspace_id, role, is_default, updated_at)
      VALUES (${input.userId}, ${workspaceId}, ${input.role}, true, now())
      ON CONFLICT (user_id, workspace_id)
      DO UPDATE
        SET role = EXCLUDED.role,
            is_default = EXCLUDED.is_default,
            updated_at = now()
    `;

    const membership = await getPreferredMembership(txSql, input.userId);
    if (!membership) {
      throw new Error('Failed to resolve default workspace membership for authenticated session');
    }

    return membership;
  });
}
