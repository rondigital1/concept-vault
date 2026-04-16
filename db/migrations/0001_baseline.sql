CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core: runs + steps (append-only observability)
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('distill','curate','webScout','pipeline')),
  status TEXT NOT NULL CHECK (status IN ('running','ok','error','partial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Migration guard: keep runs.kind constraint aligned on existing databases.
-- CREATE TABLE IF NOT EXISTS does not update existing CHECK constraints.
UPDATE runs
SET kind = 'webScout'
WHERE kind IN ('web-scout', 'web_scout');

ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_kind_check;
ALTER TABLE runs
  ADD CONSTRAINT runs_kind_check
  CHECK (kind IN ('distill','curate','webScout','research','pipeline'));

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

CREATE TABLE IF NOT EXISTS agent_profiles (
  agent_key TEXT PRIMARY KEY CHECK (agent_key IN ('pipeline','curator','webScout','distiller')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- Saved topic profiles for end-to-end agent workflows
CREATE TABLE IF NOT EXISTS saved_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  goal TEXT NOT NULL,
  focus_tags TEXT[] NOT NULL DEFAULT '{}',
  max_docs_per_run INTEGER NOT NULL DEFAULT 5 CHECK (max_docs_per_run BETWEEN 1 AND 20),
  min_quality_results INTEGER NOT NULL DEFAULT 3 CHECK (min_quality_results BETWEEN 1 AND 20),
  min_relevance_score REAL NOT NULL DEFAULT 0.8 CHECK (min_relevance_score >= 0 AND min_relevance_score <= 1),
  max_iterations INTEGER NOT NULL DEFAULT 5 CHECK (max_iterations BETWEEN 1 AND 20),
  max_queries INTEGER NOT NULL DEFAULT 10 CHECK (max_queries BETWEEN 1 AND 50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_tracked BOOLEAN NOT NULL DEFAULT false,
  cadence TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('daily', 'weekly')),
  last_run_at TIMESTAMPTZ,
  last_run_mode TEXT,
  last_signal_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_topics_active_idx
  ON saved_topics(is_active, updated_at DESC);

ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS last_run_mode TEXT;
ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMPTZ;
ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE saved_topics DROP CONSTRAINT IF EXISTS saved_topics_cadence_check;
ALTER TABLE saved_topics
  ADD CONSTRAINT saved_topics_cadence_check
  CHECK (cadence IN ('daily', 'weekly'));
CREATE INDEX IF NOT EXISTS saved_topics_tracking_idx
  ON saved_topics(is_tracked, cadence, is_active, last_run_at, last_signal_at);

-- Topic ↔ Document links for tracked refreshes and lightweight ingest enrichment.
CREATE TABLE IF NOT EXISTS topic_documents (
  topic_id UUID NOT NULL REFERENCES saved_topics(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  matched_tags TEXT[] NOT NULL DEFAULT '{}',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, document_id)
);

CREATE INDEX IF NOT EXISTS topic_documents_topic_updated_idx
  ON topic_documents(topic_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS topic_documents_document_idx
  ON topic_documents(document_id);

-- User-managed source watchlist for periodic web scouting
CREATE TABLE IF NOT EXISTS source_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('website','blog','newsletter','source')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  check_interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (check_interval_hours BETWEEN 1 AND 168),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_watchlist_active_idx
  ON source_watchlist(is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS source_watchlist_due_idx
  ON source_watchlist(is_active, last_checked_at);

-- Document favorites
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS documents_is_favorite_idx ON documents(is_favorite) WHERE is_favorite = true;

-- Collections: user-defined document groupings
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_documents (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, document_id)
);

CREATE INDEX IF NOT EXISTS collection_documents_document_idx ON collection_documents(document_id);

-- Agent-produced artifacts (review / approval inbox)
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  agent TEXT NOT NULL,
  kind TEXT NOT NULL,
  day TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  source_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (
    status IN ('proposed','approved','rejected','superseded')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Fast inbox queries (Today dashboard)
CREATE INDEX IF NOT EXISTS artifacts_day_status_idx
  ON artifacts(day, status);
CREATE UNIQUE INDEX IF NOT EXISTS artifacts_one_active_per_kind
  ON artifacts(agent, kind, day)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS artifacts_run_id_idx
  ON artifacts(run_id);
CREATE INDEX IF NOT EXISTS artifacts_agent_kind_idx
  ON artifacts(agent, kind);

-- Chat sessions metadata
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_updated_idx
  ON chat_sessions(updated_at DESC);

-- Chat history for LangChain memory
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_history_session_idx
  ON chat_history(session_id, created_at);
