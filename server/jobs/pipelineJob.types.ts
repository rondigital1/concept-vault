import type { PipelineInput } from '@/server/flows/pipeline.types';

export type PipelineJobStatus = 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed';

export interface PipelineJobRecord {
  id: string;
  workspaceId: string;
  runId: string;
  route: string;
  status: PipelineJobStatus;
  input: PipelineInput;
  idempotencyKey: string | null;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  leasedAt: string | null;
  leaseExpiresAt: string | null;
  workerId: string | null;
  lastError: Record<string, unknown> | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueuePipelineJobResult {
  jobId: string;
  runId: string;
  status: PipelineJobStatus;
  reused: boolean;
  queueDepth: number;
}

export interface PipelineWorkerDrainResult {
  completed: number;
  failed: number;
  processed: number;
  retried: number;
  workerId: string;
}

export interface DbPipelineJobRow {
  id: string;
  workspace_id: string;
  run_id: string;
  route: string;
  status: PipelineJobStatus;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  attempts: number;
  max_attempts: number;
  available_at: string;
  leased_at: string | null;
  lease_expires_at: string | null;
  worker_id: string | null;
  last_error: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcquiredPipelineJobRow extends DbPipelineJobRow {
  previous_status: PipelineJobStatus;
}

export type AcquiredPipelineJob = PipelineJobRecord & {
  previousStatus: PipelineJobStatus;
};
