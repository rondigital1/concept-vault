import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

export const client = postgres(connectionString, {
  onnotice: () => { }, // Suppress NOTICE logs (e.g., "relation already exists, skipping")
});
export const sql = client;
export const db = drizzle(client, { schema });

// Re-export schema utilities
export { ensureSchema } from './schema';
export type { SchemaInitResult } from './schema';
