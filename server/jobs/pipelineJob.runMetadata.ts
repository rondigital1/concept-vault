import type { PipelineJobJsonParam, PipelineJobSqlClient } from '@/server/jobs/pipelineJob.sql';

export async function patchRunForPipelineJob(
  sqlClient: PipelineJobSqlClient,
  params: {
    runId: string;
    metadata: Record<string, unknown>;
    status?: 'running' | 'error';
    clearEndedAt?: boolean;
  },
): Promise<void> {
  const status = params.status ?? null;
  const endedAtClause =
    params.clearEndedAt === true
      ? sqlClient`ended_at = null,`
      : status === 'error'
        ? sqlClient`ended_at = now(),`
        : sqlClient``;

  await sqlClient`
    UPDATE runs
    SET
      ${endedAtClause}
      status = COALESCE(${status}, status),
      metadata = COALESCE(metadata, '{}'::jsonb) || ${sqlClient.json(params.metadata as PipelineJobJsonParam)}
    WHERE id = ${params.runId}
  `;
}
