/**
 * Test database utilities.
 * 
 * Provides helpers for:
 * - Initializing test database schema
 * - Resetting tables between tests
 * - Seeding test data
 * 
 * Note: Uses the same db client as the app code. The DATABASE_URL
 * is set in tests/setup.ts before any imports.
 */
import { sql } from '@/db';
import { SCHEMA_SQL } from '@/db/schema';

type JsonParam = Parameters<typeof sql.json>[0];

/**
 * Initialize the test database schema.
 * Safe to call multiple times.
 */
export async function initTestSchema(): Promise<void> {
  await sql.unsafe(SCHEMA_SQL);
}

/**
 * Clean all tables (truncate) while preserving schema.
 * Fast alternative to dropping/recreating.
 */
export async function cleanAllTables(): Promise<void> {
  // Order matters due to foreign keys - delete from children first
  await sql`TRUNCATE TABLE 
    reviews,
    review_schedule,
    flashcards,
    concepts,
    related_documents,
    document_tags,
    chat_history,
    chat_sessions,
    artifacts,
    run_steps,
    runs,
    llm_calls,
    documents
    RESTART IDENTITY CASCADE`;
}

/**
 * Close the test database connection.
 * No-op: closing the shared app client can cause hangs when tests run.
 * The process exits anyway after tests complete.
 */
export async function closeTestDb(): Promise<void> {
  // Intentionally no-op
}

/**
 * Insert a test document and return its ID.
 */
export async function insertTestDocument(params: {
  title?: string;
  source?: string;
  content?: string;
  tags?: string[];
  contentHash?: string;
}): Promise<string> {
  const title = params.title ?? 'Test Document';
  const source = params.source ?? 'https://example.com/test';
  const content = params.content ?? 'This is test content for the document.';
  const tags = params.tags ?? [];
  // Use content-based hash or provided hash
  const contentHash = params.contentHash ?? `hash_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO documents (title, source, content, tags, content_hash)
    VALUES (${title}, ${source}, ${content}, ${sql.array(tags)}, ${contentHash})
    RETURNING id
  `;

  return rows[0].id;
}

/**
 * Insert a test run and return its ID.
 */
export async function insertTestRun(kind: 'distill' | 'curate' | 'webScout' = 'distill'): Promise<string> {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO runs (kind, status)
    VALUES (${kind}, 'running')
    RETURNING id
  `;

  return rows[0].id;
}

/**
 * Insert a test artifact and return its ID.
 */
export async function insertTestArtifact(params: {
  runId?: string | null;
  agent?: string;
  kind?: string;
  day?: string;
  title?: string;
  content?: Record<string, unknown>;
  sourceRefs?: Record<string, unknown>;
  status?: 'proposed' | 'approved' | 'rejected' | 'superseded';
}): Promise<string> {
  const agent = params.agent ?? 'webScout';
  const kind = params.kind ?? 'web-proposal';
  const day = params.day ?? '2025-01-15';
  const title = params.title ?? 'Test Artifact';
  const content = params.content ?? { url: 'https://example.com' };
  const sourceRefs = params.sourceRefs ?? {};
  const status = params.status ?? 'proposed';

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO artifacts (run_id, agent, kind, day, title, content, source_refs, status)
    VALUES (
      ${params.runId ?? null},
      ${agent},
      ${kind},
      ${day},
      ${title},
      ${sql.json(content as JsonParam)},
      ${sql.json(sourceRefs as JsonParam)},
      ${status}
    )
    RETURNING id
  `;

  return rows[0].id;
}

/**
 * Get an artifact by ID.
 */
export async function getTestArtifact(id: string): Promise<{
  id: string;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  status: string;
  reviewed_at: string | null;
} | null> {
  const rows = await sql<Array<{
    id: string;
    agent: string;
    kind: string;
    day: string;
    title: string;
    content: Record<string, unknown>;
    status: string;
    reviewed_at: string | null;
  }>>`
    SELECT id, agent, kind, day, title, content, status, reviewed_at
    FROM artifacts
    WHERE id = ${id}
  `;

  return rows[0] ?? null;
}

/**
 * Get all artifacts for a given day and status.
 */
export async function getTestArtifactsByDayAndStatus(
  day: string,
  status: string
): Promise<Array<{ id: string; agent: string; kind: string; title: string; status: string }>> {
  const rows = await sql<Array<{
    id: string;
    agent: string;
    kind: string;
    title: string;
    status: string;
  }>>`
    SELECT id, agent, kind, title, status
    FROM artifacts
    WHERE day = ${day} AND status = ${status}
    ORDER BY created_at ASC
  `;

  return rows;
}
