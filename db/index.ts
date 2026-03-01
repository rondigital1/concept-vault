import postgres from 'postgres';

const DEFAULT_DATABASE_URL =
  'postgresql://knowledge:knowledge@localhost:5432/concept_vault';
const DEFAULT_TEST_DATABASE_URL =
  'postgresql://knowledge:knowledge@localhost:5432/concept_vault_test';
const isVitest = Boolean(process.env.VITEST);

// Use test DB when running Vitest (avoids .env overriding test setup)
let connectionString = isVitest
  ? (process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL)
  : process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'production') {
  // Deterministic local fallback (instead of postgres defaulting to OS user/database).
  connectionString = DEFAULT_DATABASE_URL;
  console.warn('[db] DATABASE_URL is not set; using local default database URL');
}

if (!connectionString) {
  throw new Error('DATABASE_URL is required in production');
}

export const resolvedDatabaseUrl = connectionString;

export const client = postgres(connectionString, {
  onnotice: () => { }, // Suppress NOTICE logs (e.g., "relation already exists, skipping")
});
export const sql = client;
// Re-export schema utilities
export { ensureSchema } from './schema';
export type { SchemaInitResult } from './schema';
