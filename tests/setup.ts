/**
 * Global test setup for Vitest.
 * 
 * Sets up:
 * - Environment variables for test database
 * - Ensures test database exists (creates if missing)
 * - Global test utilities
 * 
 * Note: Fake timers are NOT used globally - they freeze time and cause
 * DB drivers (postgres.js) to hang because internal timeouts never fire.
 */

// Set env FIRST - before any imports that might load db
const testDbUrl = process.env.TEST_DATABASE_URL ||
  'postgresql://knowledge:knowledge@localhost:5432/knowledge_distiller_test';
process.env.DATABASE_URL = testDbUrl;

// Ensure test database exists before any code connects to it
async function ensureTestDatabase() {
  const postgres = (await import('postgres')).default;
  const baseUrl = testDbUrl.replace(/\/[^/]+$/, '/postgres'); // connect to default db
  const sql = postgres(baseUrl, { max: 1 });
  try {
    const exists = await sql`
      SELECT 1 FROM pg_database WHERE datname = 'knowledge_distiller_test'
    `;
    if (exists.length === 0) {
      await sql.unsafe('CREATE DATABASE knowledge_distiller_test');
    }
  } catch {
    // Ignore - DB may exist, or Postgres not running
  } finally {
    await sql.end();
  }
  // Enable vector extension in test DB (needed for schema)
  const sqlTest = postgres(testDbUrl, { max: 1 });
  try {
    await sqlTest.unsafe('CREATE EXTENSION IF NOT EXISTS vector');
  } catch {
    // Ignore - extension may exist or pgvector not installed
  } finally {
    await sqlTest.end();
  }
}

await ensureTestDatabase();

import { vi } from 'vitest';

// Silence console.log in tests unless DEBUG=1
if (!process.env.DEBUG) {
  vi.spyOn(console, 'log').mockImplementation(() => { });
}

// Provide helpful error message for DB connection issues
process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error &&
    (reason.message.includes('ECONNREFUSED') ||
      reason.message.includes('connection refused') ||
      reason.message.includes('AggregateError'))) {
    console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  DATABASE CONNECTION ERROR                                            ║
║                                                                        ║
║  Integration tests require a running PostgreSQL database.              ║
║                                                                        ║
║  Quick fix:                                                            ║
║    1. Start Docker: docker compose up -d                               ║
║    2. Run setup: ./scripts/test-db-setup.sh                            ║
║    3. Re-run tests: npm test                                           ║
║                                                                        ║
║  Or run unit tests only (no DB needed):                                ║
║    npm run test:unit                                                   ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  }
});
