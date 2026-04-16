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
  const { client, resolvedDatabaseUrl, runMigrations } = await import('../db');

  console.log('Running database migrations...');
  console.log(`Database: ${describeDatabase(resolvedDatabaseUrl)}`);

  try {
    const result = await runMigrations(client);

    if (result.ok) {
      console.log(
        `✓ Database schema is ready at version ${result.currentVersion ?? 'none'}`,
      );
      if (result.appliedVersions.length > 0) {
        console.log(`Applied migrations: ${result.appliedVersions.join(', ')}`);
      } else {
        console.log('No pending migrations');
      }
      process.exit(0);
    } else {
      console.error('✗ Migration run failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Unexpected migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
