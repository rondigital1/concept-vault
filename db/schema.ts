import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runMigrations, type MigrationRunResult } from './migrations';

const BASELINE_SCHEMA_PATH = path.join(process.cwd(), 'db', 'migrations', '0001_baseline.sql');
const LEGACY_BOOTSTRAP_ENV = 'ENABLE_LEGACY_SCHEMA_BOOTSTRAP';

export const SCHEMA_SQL = readFileSync(BASELINE_SCHEMA_PATH, 'utf8');

export type SchemaInitResult = MigrationRunResult;

export async function ensureSchema(sqlClient: {
  unsafe: (sql: string) => Promise<unknown>;
}): Promise<SchemaInitResult> {
  if (process.env[LEGACY_BOOTSTRAP_ENV] !== '1' && process.env[LEGACY_BOOTSTRAP_ENV] !== 'true') {
    return {
      ok: false,
      currentVersion: null,
      expectedVersion: null,
      appliedVersions: [],
      error: [
        'Legacy schema bootstrap is disabled.',
        'Run `npm run db:init` before starting the app.',
        `Set ${LEGACY_BOOTSTRAP_ENV}=1 only as a short-lived rollback fallback.`,
      ].join(' '),
    };
  }

  console.warn(`[db:migrate] legacy bootstrap enabled via ${LEGACY_BOOTSTRAP_ENV}`);
  return runMigrations(sqlClient);
}
