export type AgentRunRow = {
  id: string;
  kind: string;
  status: 'running' | 'ok' | 'error' | 'partial';
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
};

export type AgentStepRow = {
  id: string;
  run_id: string;
  step_name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  started_at: string;
  ended_at: string | null;
  output: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
};
