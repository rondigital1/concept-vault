#!/usr/bin/env tsx
/**
 * CLI script to manually initialize the database schema.
 * Useful for development, testing, and CI/CD pipelines.
 *
 * Usage:
 *   npx tsx scripts/init-schema.ts
 */

import { loadEnvConfig } from '@next/env';

function describeDatabase(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    const dbName = parsed.pathname.replace(/^\//, '') || '(default)';
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.hostname}${port}/${dbName}`;
  } catch {
    return connectionString;
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const { client, ensureSchema, resolvedDatabaseUrl } = await import('../db');

  console.log('Initializing database schema...');
  console.log(`Database: ${describeDatabase(resolvedDatabaseUrl)}`);

  try {
    const result = await ensureSchema(client);

    if (result.ok) {
      console.log('✓ Schema initialized successfully');
      process.exit(0);
    } else {
      console.error('✗ Schema initialization failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Unexpected error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
