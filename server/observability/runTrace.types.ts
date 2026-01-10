export type RunStatus = 'running' | 'ok' | 'error' | 'partial';
export type RunKind = 'distill' | 'curate';

export interface RunStep {
  timestamp: string;
  type: 'agent' | 'tool' | 'llm' | 'flow';
  name: string;
  status: 'running' | 'ok' | 'error' | 'skipped';
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: any;
  startedAt?: string;
  endedAt?: string;
  tokenEstimate?: number;
  retryCount?: number;
  tool?: string;
}

export interface RunTrace {
  id: string;
  kind: RunKind;
  status: RunStatus;
  steps: RunStep[];
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}
