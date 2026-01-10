/**
 * SQL-first schema (agent-friendly).
 *
 * Why:
 * - Agent systems are event/trace heavy (append-only), with lots of semi-structured JSON.
 * - Raw SQL + JSONB is simpler to evolve and easier to inspect than ORM schemas.
 *
 * How to use:
 * - Call `ensureSchema()` from `db/index.ts` at app startup (or from a CLI script).
 * - Later, migrate this into versioned files under `db/migrations/*.sql`.
 */

export const SCHEMA_SQL = `
-- Core: runs + steps (append-only observability)
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('distill','curate')),
  status TEXT NOT NULL CHECK (status IN ('running','ok','error','partial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  tool_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('running','ok','error','skipped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  input JSONB,
  output JSONB,
  error JSONB,
  token_estimate INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS run_steps_run_id_idx ON run_steps(run_id);
CREATE INDEX IF NOT EXISTS run_steps_status_idx ON run_steps(status);
CREATE INDEX IF NOT EXISTS run_steps_run_id_started_at_idx ON run_steps(run_id, started_at);
CREATE INDEX IF NOT EXISTS runs_started_at_idx ON runs(started_at DESC);
CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status);

-- Content: documents (keep it simple; evolve later)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- e.g., URL, filename, readwise export id
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  content_hash TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS documents_content_hash_uq ON documents(content_hash);

-- Phase 1: concepts + flashcards + SRS
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('definition','principle','framework','procedure','fact')),
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{quote, location:{startChar,endChar}}]
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS concepts_document_id_idx ON concepts(document_id);
CREATE INDEX IF NOT EXISTS concepts_label_idx ON concepts(label);

CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  format TEXT NOT NULL CHECK (format IN ('qa','cloze')),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('proposed','approved','edited','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flashcards_document_id_idx ON flashcards(document_id);
CREATE INDEX IF NOT EXISTS flashcards_status_idx ON flashcards(status);
CREATE INDEX IF NOT EXISTS flashcards_concept_id_idx ON flashcards(concept_id);

CREATE TABLE IF NOT EXISTS review_schedule (
  flashcard_id UUID PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL DEFAULT 'sm2',
  due_at TIMESTAMPTZ NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS review_schedule_due_at_idx ON review_schedule(due_at);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 5),
  ms_spent INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS reviews_flashcard_id_idx ON reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS reviews_reviewed_at_idx ON reviews(reviewed_at DESC);

-- Optional but very useful: LLM call audit (cost + debugging)
CREATE TABLE IF NOT EXISTS llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  step_id UUID REFERENCES run_steps(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL,
  schema_name TEXT NOT NULL,
  privacy_mode TEXT NOT NULL CHECK (privacy_mode IN ('standard','redact_basic')),
  input_hash TEXT NOT NULL,
  output_hash TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  status TEXT NOT NULL CHECK (status IN ('ok','error')),
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS llm_calls_run_id_idx ON llm_calls(run_id);
CREATE INDEX IF NOT EXISTS llm_calls_step_id_idx ON llm_calls(step_id);
CREATE INDEX IF NOT EXISTS llm_calls_created_at_idx ON llm_calls(created_at DESC);

-- Document ↔ Tag
CREATE TABLE IF NOT EXISTS document_tags (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (document_id, tag)
);

-- Document ↔ Document (relatedness)
CREATE TABLE IF NOT EXISTS related_documents (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  related_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  reason TEXT, -- e.g. 'shared_tags', 'semantic_similarity'
  score REAL,
  PRIMARY KEY (document_id, related_document_id)
);
`;

export type SchemaInitResult = {
  ok: boolean;
  error?: string;
};

/**
 * Initialize database schema.
 * Safe to call multiple times (uses IF NOT EXISTS).
 * Call this at app startup or before running database operations.
 */
export async function ensureSchema(sqlClient: {
  unsafe: (sql: string) => Promise<any>;
}): Promise<SchemaInitResult> {
  try {
    // Execute the schema SQL
    await sqlClient.unsafe(SCHEMA_SQL);
    return { ok: true };
  } catch (error) {
    let message = 'Unknown error';
    if (error instanceof Error) {
      // Check for common connection issues
      if (error.message.includes('AggregateError') || error.message.includes('ECONNREFUSED')) {
        message = `Database connection failed (${error.message}). Is your Docker daemon or PostgreSQL server running?`;
      } else {
        message = error.message;
      }

      if (error.stack) {
        console.error('Schema initialization error stack:', error.stack);
      }
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = JSON.stringify(error);
    }
    console.error('Schema initialization failed:', message);
    return { ok: false, error: message };
  }
}
