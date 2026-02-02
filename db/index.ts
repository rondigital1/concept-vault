import postgres from 'postgres';

// Use test DB when running Vitest (avoids .env overriding test setup)
const connectionString = process.env.VITEST
  ? (process.env.TEST_DATABASE_URL ?? 'postgresql://knowledge:knowledge@localhost:5432/knowledge_distiller_test')
  : process.env.DATABASE_URL!;

export const client = postgres(connectionString, {
  onnotice: () => { }, // Suppress NOTICE logs (e.g., "relation already exists, skipping")
});
export const sql = client;
// Re-export schema utilities
export { ensureSchema } from './schema';
export type { SchemaInitResult } from './schema';
