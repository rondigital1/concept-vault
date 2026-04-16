import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from '@/db';
import { resolveSessionIdentity } from '@/server/auth/sessionIdentity';
import { cleanAllTables, closeTestDb, initTestSchema } from '../helpers/testDb';

describe('session identity resolution', () => {
  beforeAll(async () => {
    await initTestSchema();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanAllTables();
  });

  it('creates and reuses a durable user/workspace context for authenticated sessions', async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    const first = await resolveSessionIdentity(
      {
        email: 'owner@example.com',
        name: 'Owner Person',
      },
      logger,
    );
    const second = await resolveSessionIdentity(
      {
        email: 'owner@example.com',
        name: 'Owner Person Updated',
      },
      logger,
    );

    expect(second).toEqual(first);

    const users = await sql<Array<{
      email: string;
      display_name: string | null;
      last_authenticated_at: string | null;
    }>>`
      SELECT email, display_name, last_authenticated_at
      FROM users
    `;
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe('owner@example.com');
    expect(users[0]?.display_name).toBe('Owner Person Updated');
    expect(users[0]?.last_authenticated_at).not.toBeNull();

    const memberships = await sql<Array<{
      workspace_slug: string;
      role: string;
      is_default: boolean;
    }>>`
      SELECT w.slug AS workspace_slug, m.role, m.is_default
      FROM memberships m
      INNER JOIN workspaces w ON w.id = m.workspace_id
    `;
    expect(memberships).toEqual([
      {
        workspace_slug: first.workspaceSlug,
        role: 'owner',
        is_default: true,
      },
    ]);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
});
