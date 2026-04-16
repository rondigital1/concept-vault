import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const DEFAULT_TEST_DATABASE_URL =
  'postgresql://knowledge:knowledge@localhost:5432/concept_vault_test';

let adminSql: ReturnType<typeof postgres>;
let migrationSql: ReturnType<typeof postgres>;
let migrationDbName = '';

function buildDatabaseUrl(connectionString: string, databaseName: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function resetEphemeralSchema(): Promise<void> {
  await migrationSql.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await migrationSql.unsafe('CREATE SCHEMA public');
}

describe('Schema Migrations', () => {
  beforeAll(async () => {
    const baseDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      DEFAULT_TEST_DATABASE_URL;
    const adminDatabaseUrl = buildDatabaseUrl(baseDatabaseUrl, 'postgres');
    migrationDbName = `concept_vault_migrations_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    adminSql = postgres(adminDatabaseUrl, { max: 1 });
    await adminSql.unsafe(`CREATE DATABASE ${quoteIdentifier(migrationDbName)}`);

    migrationSql = postgres(buildDatabaseUrl(baseDatabaseUrl, migrationDbName), {
      max: 1,
      onnotice: () => {},
    });
  });

  afterEach(async () => {
    vi.resetModules();
    await resetEphemeralSchema();
  });

  afterAll(async () => {
    await migrationSql.end();
    await adminSql.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = ${`'${migrationDbName.replace(/'/g, "''")}'`}
        AND pid <> pg_backend_pid()
    `);
    await adminSql.unsafe(`DROP DATABASE IF EXISTS ${quoteIdentifier(migrationDbName)}`);
    await adminSql.end();
  });

  it('bootstraps a fresh database with versioned migrations', async () => {
    const { getSchemaStatus, runMigrations } = await import('@/db/migrations');

    const before = await getSchemaStatus(migrationSql);
    expect(before.ok).toBe(false);
    expect(before.pendingVersions).toEqual(['0001', '0002']);

    const result = await runMigrations(migrationSql);
    expect(result.ok).toBe(true);
    expect(result.appliedVersions).toEqual(['0001', '0002']);
    expect(result.currentVersion).toBe('0002');

    const tables = await migrationSql<Array<{
      schema_migrations: string | null;
      agent_profiles: string | null;
      users: string | null;
      workspaces: string | null;
      memberships: string | null;
    }>>`
      SELECT
        to_regclass('public.schema_migrations')::text AS schema_migrations,
        to_regclass('public.agent_profiles')::text AS agent_profiles,
        to_regclass('public.users')::text AS users,
        to_regclass('public.workspaces')::text AS workspaces,
        to_regclass('public.memberships')::text AS memberships
    `;

    expect(tables[0]).toEqual({
      schema_migrations: 'schema_migrations',
      agent_profiles: 'agent_profiles',
      users: 'users',
      workspaces: 'workspaces',
      memberships: 'memberships',
    });

    const migrationRows = await migrationSql<Array<{ version: string; checksum: string }>>`
      SELECT version, checksum
      FROM schema_migrations
      ORDER BY version ASC
    `;

    expect(migrationRows).toHaveLength(2);
    expect(migrationRows.at(-1)?.version).toBe('0002');
    expect(migrationRows[0]?.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('upgrades an existing legacy schema into tracked migrations', async () => {
    const { SCHEMA_SQL } = await import('@/db/schema');
    const { getSchemaStatus, runMigrations } = await import('@/db/migrations');

    await migrationSql.unsafe(SCHEMA_SQL);

    const before = await getSchemaStatus(migrationSql);
    expect(before.ok).toBe(false);
    expect(before.pendingVersions).toEqual(['0001', '0002']);

    const result = await runMigrations(migrationSql);
    expect(result.ok).toBe(true);
    expect(result.appliedVersions).toEqual(['0001', '0002']);

    const after = await getSchemaStatus(migrationSql);
    expect(after.ok).toBe(true);
    expect(after.currentVersion).toBe('0002');
  });

  it('treats repeated migration runs as a no-op', async () => {
    const { runMigrations } = await import('@/db/migrations');

    const first = await runMigrations(migrationSql);
    const second = await runMigrations(migrationSql);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.appliedVersions).toEqual([]);
    expect(second.currentVersion).toBe('0002');

    const rows = await migrationSql<Array<{ count: number }>>`
      SELECT COUNT(*)::integer AS count
      FROM schema_migrations
    `;
    expect(rows[0]?.count).toBe(2);
  });

  it('fails loudly when the tracked schema drifts from migration files', async () => {
    const { assertSchemaReady, runMigrations } = await import('@/db/migrations');

    const result = await runMigrations(migrationSql);
    expect(result.ok).toBe(true);

    await migrationSql.begin(async (tx) => {
      await tx`
        UPDATE schema_migrations
        SET checksum = 'drifted'
        WHERE version = '0002'
      `;

      await expect(assertSchemaReady(tx)).rejects.toThrow(/drift detected/i);

      throw new Error('rollback');
    }).catch((error) => {
      if (!(error instanceof Error) || error.message !== 'rollback') {
        throw error;
      }
    });
  });
});
