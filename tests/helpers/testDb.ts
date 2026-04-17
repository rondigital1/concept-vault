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
import { runMigrations } from '@/db/migrations';
import type { WorkspaceScope } from '@/server/auth/workspaceContext';

type JsonParam = Parameters<typeof sql.json>[0];

type TestWorkspaceContext = WorkspaceScope & {
  userId: string;
  email: string;
};

async function createTestWorkspace(seed = 'default'): Promise<TestWorkspaceContext> {
  const suffix = `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `test-${suffix}@example.com`;
  const userRows = await sql<Array<{ id: string }>>`
    INSERT INTO users (email, display_name)
    VALUES (${email}, ${`Test User ${suffix}`})
    RETURNING id
  `;
  const userId = userRows[0].id;

  const workspaceRows = await sql<Array<{ id: string }>>`
    INSERT INTO workspaces (slug, name, owner_user_id)
    VALUES (${`test-${suffix}`}, ${`Test Workspace ${suffix}`}, ${userId})
    RETURNING id
  `;
  const workspaceId = workspaceRows[0].id;

  await sql`
    INSERT INTO memberships (user_id, workspace_id, role, is_default)
    VALUES (${userId}, ${workspaceId}, 'owner', true)
  `;

  return { userId, workspaceId, email };
}

export async function getTestWorkspaceScope(): Promise<WorkspaceScope> {
  const rows = await sql<Array<{ workspace_id: string }>>`
    SELECT workspace_id
    FROM memberships
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `;

  if (rows[0]?.workspace_id) {
    return { workspaceId: rows[0].workspace_id };
  }

  const workspace = await createTestWorkspace();
  return { workspaceId: workspace.workspaceId };
}

export async function createAdditionalTestWorkspace(seed?: string): Promise<TestWorkspaceContext> {
  return createTestWorkspace(seed ?? 'extra');
}

/**
 * Initialize the test database schema.
 * Safe to call multiple times.
 */
export async function initTestSchema(): Promise<void> {
  const result = await runMigrations(sql);
  if (!result.ok) {
    throw new Error(result.error || 'Failed to initialize test schema');
  }
}

export async function resetTestSchema(): Promise<void> {
  await sql.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await sql.unsafe('CREATE SCHEMA public');
  try {
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS vector');
  } catch {
    // Ignore if pgvector is not installed in local development.
  }
}

/**
 * Clean all tables (truncate) while preserving schema.
 * Fast alternative to dropping/recreating.
 */
export async function cleanAllTables(): Promise<void> {
  // Order matters due to foreign keys - delete from children first
  await sql`TRUNCATE TABLE 
    memberships,
    workspaces,
    users,
    reviews,
    review_schedule,
    flashcards,
    concepts,
    collection_documents,
    collections,
    related_documents,
    document_tags,
    chat_history,
    chat_sessions,
    source_watchlist,
    agent_profiles,
    topic_documents,
    saved_topics,
    pipeline_jobs,
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
  workspaceId?: string;
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
  const workspaceId = params.workspaceId ?? (await getTestWorkspaceScope()).workspaceId;
  // Use content-based hash or provided hash
  const contentHash = params.contentHash ?? `hash_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO documents (workspace_id, title, source, content, tags, content_hash)
    VALUES (${workspaceId}, ${title}, ${source}, ${content}, ${sql.array(tags)}, ${contentHash})
    RETURNING id
  `;

  return rows[0].id;
}

/**
 * Insert a test run and return its ID.
 */
export async function insertTestRun(
  scopeOrKind?: WorkspaceScope | 'distill' | 'curate' | 'webScout' | 'research' | 'pipeline',
  kind: 'distill' | 'curate' | 'webScout' | 'research' | 'pipeline' = 'distill',
): Promise<string> {
  const scope =
    typeof scopeOrKind === 'object' && scopeOrKind !== null
      ? scopeOrKind
      : await getTestWorkspaceScope();
  const resolvedKind =
    typeof scopeOrKind === 'string'
      ? scopeOrKind
      : kind;

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO runs (workspace_id, kind, status)
    VALUES (${scope.workspaceId}, ${resolvedKind}, 'running')
    RETURNING id
  `;

  return rows[0].id;
}

/**
 * Insert a test artifact and return its ID.
 */
export async function insertTestArtifact(params: {
  workspaceId?: string;
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
  const workspaceId = params.workspaceId ?? (await getTestWorkspaceScope()).workspaceId;

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO artifacts (workspace_id, run_id, agent, kind, day, title, content, source_refs, status)
    VALUES (
      ${workspaceId},
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
  const scope = await getTestWorkspaceScope();
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
    WHERE workspace_id = ${scope.workspaceId}
      AND id = ${id}
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
  const scope = await getTestWorkspaceScope();
  const rows = await sql<Array<{
    id: string;
    agent: string;
    kind: string;
    title: string;
    status: string;
  }>>`
    SELECT id, agent, kind, title, status
    FROM artifacts
    WHERE workspace_id = ${scope.workspaceId}
      AND day = ${day}
      AND status = ${status}
    ORDER BY created_at ASC
  `;

  return rows;
}
