import { sql } from '@/db';
import type { RunStatus } from '@/server/observability/runTrace.types';
import {
  createDefaultPipelineArtifacts,
  createDefaultPipelineCounts,
} from '@/server/flows/pipeline.result';
import type {
  PipelineCounts,
  PipelineError,
  PipelineResult,
  PipelineRunMode,
  PipelineTrigger,
} from '@/server/flows/pipeline.types';

interface ExistingPipelineRunRow {
  id: string;
  status: RunStatus;
}

export async function findExistingPipelineRunByIdempotencyKey(
  workspaceId: string,
  idempotencyKey: string,
): Promise<ExistingPipelineRunRow | null> {
  const rows = await sql<Array<ExistingPipelineRunRow>>`
    SELECT id, status
    FROM runs
    WHERE workspace_id = ${workspaceId}
      AND kind = 'pipeline'
      AND metadata->>'idempotencyKey' = ${idempotencyKey}
    ORDER BY started_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function hydratePipelineResultFromRun(
  workspaceId: string,
  runId: string,
): Promise<PipelineResult | null> {
  const rows = await sql<Array<{ output: Record<string, unknown> | null }>>`
    SELECT output
    FROM run_steps rs
    INNER JOIN runs r ON r.id = rs.run_id
    WHERE r.workspace_id = ${workspaceId}
      AND rs.run_id = ${runId}
      AND rs.step_name = 'pipeline'
      AND rs.status = 'ok'
      AND rs.output IS NOT NULL
    ORDER BY rs.started_at DESC
    LIMIT 1
  `;

  const output = rows[0]?.output;

  if (!output || typeof output !== 'object') {
    return null;
  }

  const mode =
    typeof output.mode === 'string'
      ? (output.mode as PipelineRunMode)
      : ('full_report' as PipelineRunMode);
  const trigger =
    typeof output.trigger === 'string'
      ? (output.trigger as PipelineTrigger)
      : ('manual' as PipelineTrigger);

  return {
    runId,
    status: (output.status as RunStatus) ?? 'partial',
    mode,
    trigger,
    counts: (output.counts as PipelineCounts) ?? createDefaultPipelineCounts(),
    artifacts: (output.artifacts as PipelineResult['artifacts']) ?? createDefaultPipelineArtifacts(),
    reportId: typeof output.reportId === 'string' ? output.reportId : null,
    notionPageId: typeof output.notionPageId === 'string' ? output.notionPageId : null,
    errors: Array.isArray(output.errors) ? (output.errors as PipelineError[]) : [],
  };
}
