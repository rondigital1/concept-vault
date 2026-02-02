#!/usr/bin/env tsx
/**
 * CLI script to initialize the TEST database schema.
 * Creates its own connection to avoid caching issues.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/init-test-schema.ts
 */

import postgres from 'postgres';
import { SCHEMA_SQL } from '../db/schema';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('✗ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Initializing test database schema...');
  console.log(`Database: ${databaseUrl.split('@')[1] || 'unknown'}`);

  // Create a fresh connection for this script
  const sql = postgres(databaseUrl, {
    onnotice: () => { }, // Suppress NOTICE logs
    max: 1,
    connect_timeout: 10,
  });

  try {
    // Test connection first
    await sql`SELECT 1`;
    console.log('✓ Connected to database');

    // Execute schema
    await sql.unsafe(SCHEMA_SQL);
    console.log('✓ Schema initialized successfully');

    process.exit(0);
  } catch (error) {
    console.error('✗ Schema initialization failed:');
    if (error instanceof Error) {
      console.error('  ', error.message);
    } else {
      console.error('  ', error);
    }
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
