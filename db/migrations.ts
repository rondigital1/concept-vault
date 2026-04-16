import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

type SqlClient = {
  unsafe: (sql: string) => Promise<unknown>;
};

type AppliedMigrationRow = {
  version: unknown;
  name: unknown;
  checksum: unknown;
  applied_at: unknown;
};

export type MigrationRecord = {
  version: string;
  name: string;
  checksum: string;
  appliedAt: string;
};

export type MigrationRunResult = {
  ok: boolean;
  currentVersion: string | null;
  expectedVersion: string | null;
  appliedVersions: string[];
  error?: string;
};

export type SchemaStatus = {
  ok: boolean;
  currentVersion: string | null;
  expectedVersion: string | null;
  pendingVersions: string[];
  driftReasons: string[];
  error?: string;
};

type MigrationFile = {
  version: string;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
};

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');
const SCHEMA_MIGRATIONS_LOCK_KEY = 924_761_202;
const SCHEMA_MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schema_migrations_applied_at_idx
  ON schema_migrations(applied_at DESC);
`;

let cachedMigrationsPromise: Promise<MigrationFile[]> | null = null;

function quoteSqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function parseMigrationFilename(filename: string): { version: string; name: string } {
  const match = filename.match(/^(\d+)(?:[_-](.+))?\.sql$/i);
  if (!match) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }

  return {
    version: match[1],
    name: (match[2] ?? 'migration').replace(/[_-]+/g, ' '),
  };
}

async function loadMigrationFiles(): Promise<MigrationFile[]> {
  if (!cachedMigrationsPromise) {
    cachedMigrationsPromise = (async () => {
      const filenames = (await fs.readdir(MIGRATIONS_DIR))
        .filter((filename) => filename.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));

      return Promise.all(
        filenames.map(async (filename) => {
          const { version, name } = parseMigrationFilename(filename);
          const sql = await fs.readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
          const checksum = createHash('sha256').update(sql).digest('hex');

          return {
            version,
            name,
            filename,
            sql,
            checksum,
          };
        }),
      );
    })();
  }

  return cachedMigrationsPromise;
}

async function hasSchemaMigrationsTable(sqlClient: SqlClient): Promise<boolean> {
  const rows = await sqlClient.unsafe(`
    SELECT to_regclass('public.schema_migrations')::text AS schema_migrations
  `) as Array<{ schema_migrations?: unknown }>;

  return rows[0]?.schema_migrations === 'schema_migrations';
}

async function ensureSchemaMigrationsTable(sqlClient: SqlClient): Promise<void> {
  await sqlClient.unsafe(SCHEMA_MIGRATIONS_TABLE_SQL);
}

async function readAppliedMigrations(sqlClient: SqlClient): Promise<MigrationRecord[]> {
  const rows = await sqlClient.unsafe(`
    SELECT version, name, checksum, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `) as AppliedMigrationRow[];

  return rows.map((row) => ({
    version: readString(row.version) ?? '',
    name: readString(row.name) ?? 'migration',
    checksum: readString(row.checksum) ?? '',
    appliedAt: readString(row.applied_at) ?? '',
  }));
}

function buildSchemaStatus(
  expectedMigrations: MigrationFile[],
  appliedMigrations: MigrationRecord[],
): SchemaStatus {
  const expectedByVersion = new Map(
    expectedMigrations.map((migration) => [migration.version, migration]),
  );
  const appliedByVersion = new Map(
    appliedMigrations.map((migration) => [migration.version, migration]),
  );

  const pendingVersions: string[] = [];
  const driftReasons: string[] = [];

  for (const migration of expectedMigrations) {
    const applied = appliedByVersion.get(migration.version);

    if (!applied) {
      pendingVersions.push(migration.version);
      continue;
    }

    if (applied.checksum !== migration.checksum) {
      driftReasons.push(`checksum mismatch for migration ${migration.version}`);
    }
  }

  for (const applied of appliedMigrations) {
    if (!expectedByVersion.has(applied.version)) {
      driftReasons.push(`unknown applied migration ${applied.version}`);
    }
  }

  const currentVersion = appliedMigrations.at(-1)?.version ?? null;
  const expectedVersion = expectedMigrations.at(-1)?.version ?? null;

  if (driftReasons.length > 0) {
    return {
      ok: false,
      currentVersion,
      expectedVersion,
      pendingVersions,
      driftReasons,
      error: [
        'Database schema drift detected.',
        `Current schema version: ${currentVersion ?? 'none'}.`,
        `Expected schema version: ${expectedVersion ?? 'none'}.`,
        `Details: ${driftReasons.join('; ')}.`,
      ].join(' '),
    };
  }

  if (pendingVersions.length > 0) {
    return {
      ok: false,
      currentVersion,
      expectedVersion,
      pendingVersions,
      driftReasons,
      error: [
        'Database schema is not up to date.',
        `Current schema version: ${currentVersion ?? 'none'}.`,
        `Expected schema version: ${expectedVersion ?? 'none'}.`,
        `Pending migrations: ${pendingVersions.join(', ')}.`,
        'Run `npm run db:init` before serving traffic.',
      ].join(' '),
    };
  }

  return {
    ok: true,
    currentVersion,
    expectedVersion,
    pendingVersions,
    driftReasons,
  };
}

function migrationSummary(status: {
  currentVersion: string | null;
  expectedVersion: string | null;
}): string {
  return `currentVersion=${status.currentVersion ?? 'none'} expectedVersion=${status.expectedVersion ?? 'none'}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : JSON.stringify(error);
}

export async function getSchemaStatus(sqlClient: SqlClient): Promise<SchemaStatus> {
  const expectedMigrations = await loadMigrationFiles();
  const expectedVersion = expectedMigrations.at(-1)?.version ?? null;

  if (!(await hasSchemaMigrationsTable(sqlClient))) {
    return {
      ok: false,
      currentVersion: null,
      expectedVersion,
      pendingVersions: expectedMigrations.map((migration) => migration.version),
      driftReasons: [],
      error: [
        'Database schema has not been initialized.',
        `Current schema version: none.`,
        `Expected schema version: ${expectedVersion ?? 'none'}.`,
        'Run `npm run db:init` before serving traffic.',
      ].join(' '),
    };
  }

  try {
    const appliedMigrations = await readAppliedMigrations(sqlClient);
    return buildSchemaStatus(expectedMigrations, appliedMigrations);
  } catch (error) {
    return {
      ok: false,
      currentVersion: null,
      expectedVersion,
      pendingVersions: [],
      driftReasons: [],
      error: `Failed to inspect database schema state: ${toErrorMessage(error)}`,
    };
  }
}

export async function runMigrations(sqlClient: SqlClient): Promise<MigrationRunResult> {
  const expectedMigrations = await loadMigrationFiles();
  const expectedVersion = expectedMigrations.at(-1)?.version ?? null;

  await sqlClient.unsafe(`SELECT pg_advisory_lock(${SCHEMA_MIGRATIONS_LOCK_KEY})`);

  try {
    await ensureSchemaMigrationsTable(sqlClient);

    const initialAppliedMigrations = await readAppliedMigrations(sqlClient);
    const initialStatus = buildSchemaStatus(expectedMigrations, initialAppliedMigrations);

    console.log(
      `[db:migrate] start ${migrationSummary(initialStatus)} migrationCount=${expectedMigrations.length}`,
    );

    if (initialStatus.driftReasons.length > 0) {
      console.error(
        `[db:migrate] failure ${migrationSummary(initialStatus)} error=${initialStatus.error}`,
      );
      return {
        ok: false,
        currentVersion: initialStatus.currentVersion,
        expectedVersion,
        appliedVersions: [],
        error: initialStatus.error,
      };
    }

    const pendingMigrations = expectedMigrations.filter(
      (migration) =>
        !initialAppliedMigrations.some((applied) => applied.version === migration.version),
    );

    const appliedVersions: string[] = [];

    for (const migration of pendingMigrations) {
      console.log(
        `[db:migrate] applying version=${migration.version} name=${migration.name} file=${migration.filename}`,
      );
      await sqlClient.unsafe(migration.sql);
      await sqlClient.unsafe(`
        INSERT INTO schema_migrations (version, name, checksum, applied_at)
        VALUES (
          ${quoteSqlLiteral(migration.version)},
          ${quoteSqlLiteral(migration.name)},
          ${quoteSqlLiteral(migration.checksum)},
          now()
        )
      `);
      appliedVersions.push(migration.version);
    }

    const finalAppliedMigrations = await readAppliedMigrations(sqlClient);
    const finalStatus = buildSchemaStatus(expectedMigrations, finalAppliedMigrations);

    if (!finalStatus.ok) {
      console.error(
        `[db:migrate] failure ${migrationSummary(finalStatus)} error=${finalStatus.error}`,
      );
      return {
        ok: false,
        currentVersion: finalStatus.currentVersion,
        expectedVersion,
        appliedVersions,
        error: finalStatus.error,
      };
    }

    console.log(
      `[db:migrate] success ${migrationSummary(finalStatus)} appliedVersions=${appliedVersions.join(',') || 'none'}`,
    );

    return {
      ok: true,
      currentVersion: finalStatus.currentVersion,
      expectedVersion,
      appliedVersions,
    };
  } catch (error) {
    const status = await getSchemaStatus(sqlClient).catch(() => ({
      currentVersion: null,
      expectedVersion,
    }));
    const message = toErrorMessage(error);
    console.error(
      `[db:migrate] failure ${migrationSummary(status)} error=${message}`,
    );
    return {
      ok: false,
      currentVersion: status.currentVersion,
      expectedVersion,
      appliedVersions: [],
      error: message,
    };
  } finally {
    try {
      await sqlClient.unsafe(`SELECT pg_advisory_unlock(${SCHEMA_MIGRATIONS_LOCK_KEY})`);
    } catch (unlockError) {
      console.error('[db:migrate] failed to release advisory lock', unlockError);
    }
  }
}

export async function assertSchemaReady(sqlClient: SqlClient): Promise<SchemaStatus> {
  const status = await getSchemaStatus(sqlClient);

  if (!status.ok) {
    console.error(`[db:migrate] schema check failed ${migrationSummary(status)} error=${status.error}`);
    throw new Error(status.error ?? 'Database schema is not ready');
  }

  console.log(`[db:migrate] schema ready ${migrationSummary(status)}`);
  return status;
}
