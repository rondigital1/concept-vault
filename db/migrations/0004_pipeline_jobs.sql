CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id UUID NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'retrying', 'succeeded', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  leased_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  worker_id TEXT,
  last_error JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_jobs_workspace_status_available_idx
  ON pipeline_jobs(workspace_id, status, available_at, created_at);

CREATE INDEX IF NOT EXISTS pipeline_jobs_status_available_idx
  ON pipeline_jobs(status, available_at, created_at);

CREATE INDEX IF NOT EXISTS pipeline_jobs_workspace_created_idx
  ON pipeline_jobs(workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS pipeline_jobs_active_idempotency_uq
  ON pipeline_jobs(workspace_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND status <> 'failed';
