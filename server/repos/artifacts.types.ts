import { sql } from '@/db';

export type JsonParam = Parameters<typeof sql.json>[0];

export type ArtifactStatus = 'proposed' | 'approved' | 'rejected' | 'superseded';

export interface ArtifactRow {
  id: string;
  run_id: string | null;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  status: ArtifactStatus;
  created_at: string;
  reviewed_at: string | null;
  read_at: string | null;
}

export interface ArtifactInput {
  workspaceId: string;
  runId: string | null;
  agent: string;
  kind: string;
  day: string;
  title: string;
  content: Record<string, unknown>;
  sourceRefs: Record<string, unknown>;
}
