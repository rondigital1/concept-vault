import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString, {
  onnotice: () => { }, // Suppress NOTICE logs (e.g., "relation already exists, skipping")
});
export const sql = client;
// Re-export schema utilities
export { ensureSchema } from './schema';
export type { SchemaInitResult } from './schema';
