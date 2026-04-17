ALTER TABLE runs ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE saved_topics ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE source_watchlist ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS workspace_id UUID;

DO $$
DECLARE
  default_workspace_id UUID;
BEGIN
  SELECT m.workspace_id
  INTO default_workspace_id
  FROM memberships m
  ORDER BY m.is_default DESC, m.created_at ASC
  LIMIT 1;

  IF default_workspace_id IS NULL THEN
    SELECT w.id
    INTO default_workspace_id
    FROM workspaces w
    ORDER BY w.created_at ASC
    LIMIT 1;
  END IF;

  IF default_workspace_id IS NULL THEN
    INSERT INTO workspaces (slug, name, owner_user_id, updated_at)
    VALUES ('legacy-default', 'Legacy Workspace', NULL, now())
    ON CONFLICT (slug)
    DO UPDATE
      SET updated_at = now()
    RETURNING id INTO default_workspace_id;
  END IF;

  IF default_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace scoping migration could not resolve a default workspace';
  END IF;

  UPDATE runs
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE documents
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE saved_topics
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE source_watchlist
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE collections
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE chat_sessions
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;

  UPDATE artifacts a
  SET workspace_id = r.workspace_id
  FROM runs r
  WHERE a.workspace_id IS NULL
    AND a.run_id = r.id;

  UPDATE artifacts
  SET workspace_id = default_workspace_id
  WHERE workspace_id IS NULL;
END
$$;

ALTER TABLE runs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE saved_topics ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE source_watchlist ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE collections ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE artifacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE chat_sessions ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_workspace_id_fkey;
ALTER TABLE runs
  ADD CONSTRAINT runs_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_workspace_id_fkey;
ALTER TABLE documents
  ADD CONSTRAINT documents_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE saved_topics DROP CONSTRAINT IF EXISTS saved_topics_workspace_id_fkey;
ALTER TABLE saved_topics
  ADD CONSTRAINT saved_topics_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE source_watchlist DROP CONSTRAINT IF EXISTS source_watchlist_workspace_id_fkey;
ALTER TABLE source_watchlist
  ADD CONSTRAINT source_watchlist_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_workspace_id_fkey;
ALTER TABLE collections
  ADD CONSTRAINT collections_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE artifacts DROP CONSTRAINT IF EXISTS artifacts_workspace_id_fkey;
ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_workspace_id_fkey;
ALTER TABLE chat_sessions
  ADD CONSTRAINT chat_sessions_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE saved_topics DROP CONSTRAINT IF EXISTS saved_topics_name_key;
ALTER TABLE source_watchlist DROP CONSTRAINT IF EXISTS source_watchlist_url_key;

DROP INDEX IF EXISTS documents_content_hash_uq;
CREATE UNIQUE INDEX IF NOT EXISTS documents_workspace_content_hash_uq
  ON documents(workspace_id, content_hash);
CREATE INDEX IF NOT EXISTS documents_workspace_imported_at_idx
  ON documents(workspace_id, imported_at DESC);
CREATE INDEX IF NOT EXISTS documents_workspace_is_favorite_idx
  ON documents(workspace_id, is_favorite)
  WHERE is_favorite = true;

DROP INDEX IF EXISTS saved_topics_active_idx;
DROP INDEX IF EXISTS saved_topics_tracking_idx;
CREATE UNIQUE INDEX IF NOT EXISTS saved_topics_workspace_name_uq
  ON saved_topics(workspace_id, name);
CREATE INDEX IF NOT EXISTS saved_topics_workspace_active_idx
  ON saved_topics(workspace_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS saved_topics_workspace_tracking_idx
  ON saved_topics(workspace_id, is_tracked, cadence, is_active, last_run_at, last_signal_at);

DROP INDEX IF EXISTS source_watchlist_active_idx;
DROP INDEX IF EXISTS source_watchlist_due_idx;
CREATE UNIQUE INDEX IF NOT EXISTS source_watchlist_workspace_url_uq
  ON source_watchlist(workspace_id, url);
CREATE INDEX IF NOT EXISTS source_watchlist_workspace_active_idx
  ON source_watchlist(workspace_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS source_watchlist_workspace_due_idx
  ON source_watchlist(workspace_id, is_active, last_checked_at);

CREATE INDEX IF NOT EXISTS collections_workspace_updated_idx
  ON collections(workspace_id, updated_at DESC);

DROP INDEX IF EXISTS artifacts_day_status_idx;
DROP INDEX IF EXISTS artifacts_one_active_per_kind;
DROP INDEX IF EXISTS artifacts_run_id_idx;
DROP INDEX IF EXISTS artifacts_agent_kind_idx;
CREATE INDEX IF NOT EXISTS artifacts_workspace_day_status_idx
  ON artifacts(workspace_id, day, status);
CREATE UNIQUE INDEX IF NOT EXISTS artifacts_workspace_one_active_per_kind
  ON artifacts(workspace_id, agent, kind, day)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS artifacts_workspace_run_id_idx
  ON artifacts(workspace_id, run_id)
  WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artifacts_workspace_agent_kind_idx
  ON artifacts(workspace_id, agent, kind);

DROP INDEX IF EXISTS chat_sessions_updated_idx;
CREATE INDEX IF NOT EXISTS chat_sessions_workspace_updated_idx
  ON chat_sessions(workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS runs_workspace_started_at_idx
  ON runs(workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS runs_workspace_status_idx
  ON runs(workspace_id, status);
