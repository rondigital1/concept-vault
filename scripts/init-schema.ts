#!/usr/bin/env tsx
/**
 * CLI script to manually initialize the database schema.
 * Useful for development, testing, and CI/CD pipelines.
 *
 * Usage:
 *   npx tsx scripts/init-schema.ts
 */

import { client, ensureSchema } from '../db';

async function main() {
  console.log('Initializing database schema...');
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1] || 'unknown'}`);

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
